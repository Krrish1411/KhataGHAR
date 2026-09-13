export interface ElectronSqliteRow {
  [key: string]: any;
}

export interface ElectronSqliteAPI {
  isElectron: boolean;
  platform: 'win32' | 'linux' | 'darwin';
  dbInit: () => Promise<{ success: boolean; path: string; journalMode: string }>;
  dbExec: (sql: string, params?: any[]) => Promise<void>;
  dbQuery: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  dbGet: <T = any>(sql: string, params?: any[]) => Promise<T | undefined>;
  dbRun: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number | bigint }>;
  dbBatchSave: (table: string, rows: any[]) => Promise<void>;
  dbVacuum: () => Promise<{ success: boolean; reclaimedBytes?: number }>;
  dbExportBackup: () => Promise<Uint8Array>;
  dbImportBackup: (binaryData: Uint8Array) => Promise<{ success: boolean }>;
  getDbInfo: () => Promise<{ path: string; sizeBytes: number; journalMode: string }>;
  purgeMemory: () => Promise<{ success: boolean }>;
}

export interface ElectronSystemAPI {
  getMemoryUsage: () => Promise<{ heapUsed: number; heapTotal: number; rss: number }>;
  clearCache: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;
      sqlite: ElectronSqliteAPI;
      system: ElectronSystemAPI;
    };
  }
}
