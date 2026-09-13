import type { IDatabase, DatabaseStats, AppConfigRecord } from './types';
import type { VaultMeta, EncryptedRecord } from '../types';

/**
 * Native SQLite 3 Database Adapter for Desktop Electron
 * Communicates over secure IPC with node:sqlite / SQLite3 in the Electron main process.
 * Stores data in `<userData>/khataghar.sqlite` with WAL mode and B-Tree indexing.
 */
export class SqliteElectronAdapter implements IDatabase {
  private api = window.electronAPI!.sqlite;

  async init(): Promise<void> {
    await this.api.dbInit();
  }

  vaults = {
    put: async (vault: VaultMeta): Promise<void> => {
      await this.api.dbRun(
        `INSERT OR REPLACE INTO vaults_meta (
          id, name, salt, verifier, currency, number_format, fy_start_month,
          is_primary, auto_lock_minutes, exchange_rates_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vault.id,
          vault.name,
          vault.salt,
          vault.verifier,
          vault.currency || 'INR',
          vault.numberFormat || 'indian',
          vault.fyStartMonth ?? 4,
          vault.isPrimary ? 1 : 0,
          vault.autoLockMinutes ?? 5,
          JSON.stringify(vault.exchangeRates || {}),
          vault.createdAt,
          new Date().toISOString(),
        ]
      );
    },

    get: async (id: string): Promise<VaultMeta | undefined> => {
      const row = await this.api.dbGet<any>(
        'SELECT * FROM vaults_meta WHERE id = ?',
        [id]
      );
      if (!row) return undefined;
      return this.mapVaultRow(row);
    },

    toArray: async (): Promise<VaultMeta[]> => {
      const rows = await this.api.dbQuery<any>(
        'SELECT * FROM vaults_meta ORDER BY is_primary DESC, created_at ASC'
      );
      return rows.map((r) => this.mapVaultRow(r));
    },

    delete: async (id: string): Promise<void> => {
      await this.api.dbRun('DELETE FROM vaults_meta WHERE id = ?', [id]);
    },

    update: async (id: string, changes: Partial<VaultMeta>): Promise<void> => {
      const existing = await this.vaults.get(id);
      if (!existing) return;
      const updated = { ...existing, ...changes };
      await this.vaults.put(updated);
    },
  };

  records = {
    put: async (record: EncryptedRecord): Promise<void> => {
      await this.api.dbRun(
        `INSERT OR REPLACE INTO records (
          id, vault_id, type, encrypted_data, iv, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.vaultId,
          record.type,
          record.ciphertext,
          record.iv,
          record.updatedAt || new Date().toISOString(),
        ]
      );
    },

    bulkPut: async (records: EncryptedRecord[]): Promise<void> => {
      if (!records || records.length === 0) return;
      const rows = records.map((r) => ({
        id: r.id,
        vault_id: r.vaultId,
        type: r.type,
        encrypted_data: r.ciphertext,
        iv: r.iv,
        updated_at: r.updatedAt || new Date().toISOString(),
      }));
      await this.api.dbBatchSave('records', rows);
    },

    get: async (id: string): Promise<EncryptedRecord | undefined> => {
      const row = await this.api.dbGet<any>(
        'SELECT * FROM records WHERE id = ?',
        [id]
      );
      if (!row) return undefined;
      return {
        id: row.id,
        vaultId: row.vault_id,
        type: row.type,
        ciphertext: row.encrypted_data,
        iv: row.iv,
        updatedAt: row.updated_at,
      };
    },

    delete: async (id: string): Promise<void> => {
      await this.api.dbRun('DELETE FROM records WHERE id = ?', [id]);
    },

    bulkDelete: async (ids: string[]): Promise<void> => {
      if (!ids || ids.length === 0) return;
      const placeholders = ids.map(() => '?').join(',');
      await this.api.dbRun(`DELETE FROM records WHERE id IN (${placeholders})`, ids);
    },

    clear: async (): Promise<void> => {
      await this.api.dbRun('DELETE FROM records');
    },

    where: (field: 'vaultId') => ({
      equals: (vaultId: string) => ({
        toArray: async (): Promise<EncryptedRecord[]> => {
          const rows = await this.api.dbQuery<any>(
            'SELECT * FROM records WHERE vault_id = ? ORDER BY updated_at ASC',
            [vaultId]
          );
          return rows.map((row) => ({
            id: row.id,
            vaultId: row.vault_id,
            type: row.type,
            ciphertext: row.encrypted_data,
            iv: row.iv,
            updatedAt: row.updated_at,
          }));
        },
        delete: async (): Promise<number> => {
          const res = await this.api.dbRun('DELETE FROM records WHERE vault_id = ?', [vaultId]);
          return res.changes;
        },
      }),
    }),
  };

  appConfig = {
    get: async (key: string): Promise<AppConfigRecord | undefined> => {
      const row = await this.api.dbGet<any>(
        'SELECT * FROM app_settings WHERE key = ?',
        [key]
      );
      if (!row) return undefined;
      return {
        key: row.key,
        value: JSON.parse(row.value_json),
      };
    },

    put: async (record: AppConfigRecord): Promise<void> => {
      await this.api.dbRun(
        'INSERT OR REPLACE INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)',
        [record.key, JSON.stringify(record.value), new Date().toISOString()]
      );
    },

    delete: async (key: string): Promise<void> => {
      await this.api.dbRun('DELETE FROM app_settings WHERE key = ?', [key]);
    },
  };

  async transaction<T>(mode: 'rw' | 'r', ...tablesAndFn: any[]): Promise<T> {
    const fn = tablesAndFn[tablesAndFn.length - 1];
    if (typeof fn === 'function') {
      return await fn();
    }
    return undefined as unknown as T;
  }

  async purgeStorage(): Promise<{ reclaimedBytes?: number }> {
    const res = await this.api.dbVacuum();
    if (window.electronAPI?.system?.clearCache) {
      await window.electronAPI.system.clearCache();
    }
    return { reclaimedBytes: res.reclaimedBytes };
  }

  async getStats(): Promise<DatabaseStats> {
    const info = await this.api.getDbInfo();
    const vaultCount = (await this.vaults.toArray()).length;
    const recordCountRow = await this.api.dbGet<any>('SELECT COUNT(*) as cnt FROM records');

    return {
      engine: 'sqlite-native',
      filePath: info.path,
      fileSizeBytes: info.sizeBytes,
      vaultCount,
      recordCount: recordCountRow?.cnt || 0,
      journalMode: info.journalMode || 'WAL',
    };
  }

  async exportSqliteBinary(): Promise<Uint8Array> {
    return await this.api.dbExportBackup();
  }

  async importSqliteBinary(data: Uint8Array): Promise<void> {
    await this.api.dbImportBackup(data);
  }

  private mapVaultRow(row: any): VaultMeta {
    let exchangeRates = {};
    try {
      exchangeRates = JSON.parse(row.exchange_rates_json || '{}');
    } catch {}

    return {
      id: row.id,
      name: row.name,
      salt: row.salt,
      verifier: row.verifier,
      currency: row.currency,
      numberFormat: row.number_format,
      fyStartMonth: row.fy_start_month,
      isPrimary: Boolean(row.is_primary),
      includeInFamilyOverview: true,
      autoLockMinutes: row.auto_lock_minutes,
      exchangeRates,
      createdAt: row.created_at,
    };
  }
}
