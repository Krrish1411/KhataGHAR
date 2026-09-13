const { app, BrowserWindow, ipcMain, session, Notification } = require('electron');
const path = require('path');
const db = require('./db.cjs');

let mainWindow = null;

// Enforce single instance lock to prevent multiple instances consuming double RAM
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#0a0f0c',
    title: 'KhataGHAR — Sovereign Wealth Operating System',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: true, // Crucial: Throttles CPU when window is hidden/minimized
      spellcheck: false, // Saves RAM
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Memory optimization: clear cache on minimize/hide
  mainWindow.on('minimize', () => {
    try {
      if (global.gc) global.gc();
    } catch {}
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Production Security & Anti-Reverse Engineering Guards
    mainWindow.removeMenu();
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });

    // Block inspector hotkeys (F12, Ctrl+Shift+I, Cmd+Option+I, Ctrl+Shift+J)
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if ((input.control || input.meta) && input.shift && ['i', 'j', 'c'].includes(input.key.toLowerCase())) {
        event.preventDefault();
      }
      if (input.key === 'F12') {
        event.preventDefault();
      }
    });

    // Block remote navigation & untrusted window popups
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://')) event.preventDefault();
    });

    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Register IPC handlers for Native SQLite
function registerIpcHandlers() {
  const userDataPath = app.getPath('userData');

  ipcMain.handle('db-init', async () => {
    return db.initDatabase(userDataPath);
  });

  ipcMain.handle('db-exec', async (event, sql, params) => {
    return db.execSql(sql, params);
  });

  ipcMain.handle('db-query', async (event, sql, params) => {
    return db.querySql(sql, params);
  });

  ipcMain.handle('db-get', async (event, sql, params) => {
    return db.getSql(sql, params);
  });

  ipcMain.handle('db-run', async (event, sql, params) => {
    return db.execSql(sql, params);
  });

  ipcMain.handle('db-batch-save', async (event, table, rows) => {
    return db.batchSave(table, rows);
  });

  ipcMain.handle('db-vacuum', async () => {
    return db.vacuumDatabase();
  });

  ipcMain.handle('db-export-backup', async () => {
    return db.exportBackup();
  });

  ipcMain.handle('db-import-backup', async (event, binaryData) => {
    return db.importBackup(binaryData);
  });

  ipcMain.handle('db-get-info', async () => {
    return db.getDbInfo();
  });

  // System & memory management handlers
  ipcMain.handle('system-memory-usage', async () => {
    const memory = process.memoryUsage();
    return {
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      rss: memory.rss,
    };
  });

  ipcMain.handle('system-clear-cache', async () => {
    if (mainWindow && mainWindow.webContents && mainWindow.webContents.session) {
      await mainWindow.webContents.session.clearCache();
    }
    if (global.gc) {
      try { global.gc(); } catch {}
    }
    return { success: true };
  });

  ipcMain.handle('system-purge-memory', async () => {
    db.vacuumDatabase();
    if (session.defaultSession) {
      await session.defaultSession.clearCache();
    }
    if (global.gc) {
      try { global.gc(); } catch {}
    }
    return { success: true };
  });

  ipcMain.handle('show-notification', async (_event, options) => {
    try {
      if (Notification.isSupported()) {
        new Notification({
          title: options?.title || 'KhataGHAR',
          body: options?.body || '',
          icon: path.join(__dirname, '../build/icon.png'),
        }).show();
        return true;
      }
    } catch (e) {
      console.warn('Electron notification error:', e);
    }
    return false;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
