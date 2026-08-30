const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DontStopElectronUpdater', {
  downloadAndInstall: (url) => ipcRenderer.invoke('dont-stop:download-and-install', url)
});
