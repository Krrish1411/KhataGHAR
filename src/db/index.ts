import type { IDatabase } from './types';
import { SqliteElectronAdapter } from './sqliteElectronAdapter';
import { WebSqliteAdapter } from './webSqlite';

export * from './types';
export * from './deviceKey';
export { rawDexieDb } from './indexedDbAdapter';

/**
 * Universal Database Router
 * Detects the runtime environment and routes queries to:
 * 1. Desktop Electron: Native SQLite (node:sqlite / sqlite3) with WAL mode and B-Tree indexes
 * 2. Web / Android: WASM SQLite with resilient snapshot persistence
 */
function createDatabaseInstance(): IDatabase {
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    const electronAdapter = new SqliteElectronAdapter();
    electronAdapter.init().catch((err) => {
      console.warn('Failed to initialize native Electron SQLite, falling back to web adapter:', err);
    });
    return electronAdapter;
  }

  const webAdapter = new WebSqliteAdapter();
  webAdapter.init().catch((err) => {
    console.warn('Failed to initialize web SQLite engine:', err);
  });
  return webAdapter;
}

export const db: IDatabase = createDatabaseInstance();
