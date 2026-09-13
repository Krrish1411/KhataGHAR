const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  sqlite: {
    isElectron: true,
    platform: process.platform,
    dbInit: () => ipcRenderer.invoke('db-init'),
    dbExec: (sql, params) => ipcRenderer.invoke('db-exec', sql, params),
    dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
    dbGet: (sql, params) => ipcRenderer.invoke('db-get', sql, params),
    dbRun: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
    dbBatchSave: (table, rows) => ipcRenderer.invoke('db-batch-save', table, rows),
    dbVacuum: () => ipcRenderer.invoke('db-vacuum'),
    dbExportBackup: () => ipcRenderer.invoke('db-export-backup'),
    dbImportBackup: (binaryData) => ipcRenderer.invoke('db-import-backup', binaryData),
    getDbInfo: () => ipcRenderer.invoke('db-get-info'),
    purgeMemory: () => ipcRenderer.invoke('system-purge-memory'),
  },

  system: {
    getMemoryUsage: () => ipcRenderer.invoke('system-memory-usage'),
    clearCache: () => ipcRenderer.invoke('system-clear-cache'),
  },

  notification: {
    show: (options) => ipcRenderer.invoke('show-notification', options),
  },
});
