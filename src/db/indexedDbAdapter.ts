import Dexie, { type Table } from 'dexie';
import type { IDatabase, DatabaseStats, AppConfigRecord } from './types';
import type { VaultMeta, EncryptedRecord } from '../types';

export class KhataGharDexieDatabase extends Dexie {
  vaults!: Table<VaultMeta, string>;
  records!: Table<EncryptedRecord, string>;
  appConfig!: Table<AppConfigRecord, string>;

  constructor() {
    super('KhataGharDB');
    this.version(1).stores({
      vaults: 'id, name, isPrimary, createdAt',
      records: 'id, vaultId, type, updatedAt, [vaultId+type]',
      appConfig: 'key',
    });
  }
}

export const rawDexieDb = new KhataGharDexieDatabase();

export class IndexedDbAdapter implements IDatabase {
  private dexie = rawDexieDb;

  vaults = {
    put: async (vault: VaultMeta): Promise<void> => {
      await this.dexie.vaults.put(vault);
    },
    get: async (id: string): Promise<VaultMeta | undefined> => {
      return await this.dexie.vaults.get(id);
    },
    toArray: async (): Promise<VaultMeta[]> => {
      return await this.dexie.vaults.toArray();
    },
    delete: async (id: string): Promise<void> => {
      await this.dexie.vaults.delete(id);
    },
    update: async (id: string, changes: Partial<VaultMeta>): Promise<void> => {
      await this.dexie.vaults.update(id, changes);
    },
  };

  records = {
    put: async (record: EncryptedRecord): Promise<void> => {
      await this.dexie.records.put(record);
    },
    bulkPut: async (records: EncryptedRecord[]): Promise<void> => {
      await this.dexie.records.bulkPut(records);
    },
    get: async (id: string): Promise<EncryptedRecord | undefined> => {
      return await this.dexie.records.get(id);
    },
    delete: async (id: string): Promise<void> => {
      await this.dexie.records.delete(id);
    },
    bulkDelete: async (ids: string[]): Promise<void> => {
      await this.dexie.records.bulkDelete(ids);
    },
    clear: async (): Promise<void> => {
      await this.dexie.records.clear();
    },
    where: (field: 'vaultId') => ({
      equals: (vaultId: string) => ({
        toArray: async (): Promise<EncryptedRecord[]> => {
          return await this.dexie.records.where('vaultId').equals(vaultId).toArray();
        },
        delete: async (): Promise<number> => {
          return await this.dexie.records.where('vaultId').equals(vaultId).delete();
        },
      }),
    }),
  };

  appConfig = {
    get: async (key: string): Promise<AppConfigRecord | undefined> => {
      return await this.dexie.appConfig.get(key);
    },
    put: async (record: AppConfigRecord): Promise<void> => {
      await this.dexie.appConfig.put(record);
    },
    delete: async (key: string): Promise<void> => {
      await this.dexie.appConfig.delete(key);
    },
  };

  async transaction<T>(mode: 'rw' | 'r', ...tablesAndFn: any[]): Promise<T> {
    const fn = tablesAndFn[tablesAndFn.length - 1];
    if (typeof fn === 'function') {
      return await this.dexie.transaction(mode as any, this.dexie.vaults, this.dexie.records, fn);
    }
    return undefined as unknown as T;
  }

  async purgeStorage(): Promise<{ reclaimedBytes?: number }> {
    // Purge cached service worker entries and transient blobs
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (name.includes('temp') || name.includes('transient')) {
            await caches.delete(name);
          }
        }
      } catch {}
    }
    return { reclaimedBytes: 0 };
  }

  async getStats(): Promise<DatabaseStats> {
    const vaults = await this.dexie.vaults.toArray();
    const records = await this.dexie.records.toArray();

    let storageEstimate: StorageEstimate | undefined;
    if (navigator.storage && navigator.storage.estimate) {
      try {
        storageEstimate = await navigator.storage.estimate();
      } catch {}
    }

    return {
      engine: 'indexeddb-legacy',
      fileSizeBytes: storageEstimate?.usage,
      vaultCount: vaults.length,
      recordCount: records.length,
    };
  }
}
