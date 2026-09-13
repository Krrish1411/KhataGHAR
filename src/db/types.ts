import type {
  VaultMeta,
  EncryptedRecord,
} from '../types';

export interface AppConfigRecord {
  key: string;
  value: any;
}

export interface DatabaseStats {
  engine: 'sqlite-native' | 'sqlite-wasm' | 'indexeddb-legacy';
  filePath?: string;
  fileSizeBytes?: number;
  vaultCount: number;
  recordCount: number;
  tableCounts?: Record<string, number>;
  journalMode?: string;
  memoryUsageBytes?: number;
}

export interface IDatabase {
  // Vaults table
  vaults: {
    put(vault: VaultMeta): Promise<void>;
    get(id: string): Promise<VaultMeta | undefined>;
    toArray(): Promise<VaultMeta[]>;
    delete(id: string): Promise<void>;
    update(id: string, changes: Partial<VaultMeta>): Promise<void>;
  };

  // Encrypted records store (supports both legacy encrypted blobs and normalized tables)
  records: {
    put(record: EncryptedRecord): Promise<void>;
    bulkPut(records: EncryptedRecord[]): Promise<void>;
    get(id: string): Promise<EncryptedRecord | undefined>;
    delete(id: string): Promise<void>;
    bulkDelete(ids: string[]): Promise<void>;
    clear(): Promise<void>;
    where(field: 'vaultId'): {
      equals(vaultId: string): {
        toArray(): Promise<EncryptedRecord[]>;
        delete(): Promise<number>;
      };
    };
  };

  // App configuration key-value store
  appConfig: {
    get(key: string): Promise<AppConfigRecord | undefined>;
    put(record: AppConfigRecord): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // Atomic transaction support
  transaction<T>(mode: 'rw' | 'r', ...tablesAndFn: any[]): Promise<T>;

  // System & Maintenance tools
  purgeStorage(): Promise<{ reclaimedBytes?: number }>;
  getStats(): Promise<DatabaseStats>;
  exportSqliteBinary?(): Promise<Uint8Array>;
  importSqliteBinary?(data: Uint8Array): Promise<void>;
}
