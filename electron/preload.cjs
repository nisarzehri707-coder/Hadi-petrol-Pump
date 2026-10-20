const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  appVersion: '1.0.0',
  platform: process.platform,
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  createBackup: () => ipcRenderer.invoke('create-backup'),
});
