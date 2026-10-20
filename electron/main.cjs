const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const { pathToFileURL } = require('url');

// Single instance lock to avoid multiple server/database instances
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  console.log('Another instance of Hadi Petrol Pump is already running. Exiting.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let httpServer = null;
let isQuitting = false;

// Determine persistent data directories in Windows %APPDATA%
const userDataPath = app.getPath('userData');
const databaseDir = path.join(userDataPath, 'database');
const backupsDir = path.join(userDataPath, 'backups');

if (!fs.existsSync(databaseDir)) fs.mkdirSync(databaseDir, { recursive: true });
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

const sqlitePath = path.join(databaseDir, 'hadi_petrol.sqlite');
process.env.SQLITE_DB_PATH = sqlitePath;
process.env.IS_DESKTOP = 'true';
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'hadi_petrol_desktop_app_secure_key_2026';

console.log('Hadi Petrol Pump Desktop Starting...');
console.log('Database Path:', sqlitePath);
console.log('Backups Directory:', backupsDir);

// Find available port starting from 3001
function findFreePort(startPort) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.listen(startPort, '127.0.0.1', () => {
      tester.close(() => resolve(startPort));
    });
    tester.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

// Wait for HTTP server to respond with 200 OK
function waitForServer(url, timeoutMs = 25000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Server startup timed out after ${timeoutMs}ms at ${url}`));
      } else {
        setTimeout(check, 300);
      }
    };

    check();
  });
}

async function startBackend(port) {
  process.env.PORT = String(port);
  process.env.HOST = '127.0.0.1';
  process.env.CORS_ORIGIN = `http://127.0.0.1:${port}`;

  // In packaged app, resources are in process.resourcesPath
  const serverRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.resolve(__dirname, '../server');

  const serverIndexFile = path.join(serverRoot, 'src', 'index.js');
  console.log('Loading server from:', serverIndexFile);

  const serverModuleUrl = pathToFileURL(serverIndexFile).href;
  const serverModule = await import(serverModuleUrl);

  httpServer = await serverModule.startServer();
  return httpServer;
}

function createMainWindow(port) {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.ico')
    : path.resolve(__dirname, '../assets/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Hadi Petrol Pump - Management System',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const appUrl = `http://127.0.0.1:${port}`;
  mainWindow.loadURL(appUrl);
}

// Focus existing window on secondary instance launch
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Backup on exit
function backupDatabaseOnExit() {
  try {
    if (fs.existsSync(sqlitePath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupsDir, `hadi_petrol_auto_backup_${timestamp}.sqlite`);
      fs.copyFileSync(sqlitePath, backupFile);
      console.log('✓ Automatic backup saved on exit:', backupFile);
    }
  } catch (err) {
    console.error('Failed to create backup on exit:', err);
  }
}

// IPC Handlers
ipcMain.handle('get-app-data-path', () => userDataPath);
ipcMain.handle('create-backup', async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupsDir, `hadi_petrol_manual_backup_${timestamp}.sqlite`);
    if (fs.existsSync(sqlitePath)) {
      fs.copyFileSync(sqlitePath, backupFile);
      return { success: true, path: backupFile };
    }
    return { success: false, error: 'Database file not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Application startup
app.whenReady().then(async () => {
  try {
    const port = await findFreePort(3001);
    console.log(`Allocated local port: ${port}`);

    await startBackend(port);
    await waitForServer(`http://127.0.0.1:${port}/api/health`, 30000);
    console.log('Backend health verified. Opening desktop interface.');

    createMainWindow(port);
  } catch (err) {
    console.error('Fatal Desktop Application Startup Error:', err);
    dialog.showErrorBox(
      'Hadi Petrol Pump Startup Error',
      `Failed to launch local application service:\n\n${err.message}\n\nPlease contact support or check system logs.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (isQuitting) return;
  isQuitting = true;
  backupDatabaseOnExit();

  if (httpServer && typeof httpServer.close === 'function') {
    httpServer.close();
  }
});
