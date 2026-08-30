const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DontStopElectronUpdater', {
  downloadAndInstall: (url) => ipcRenderer.invoke('dont-stop:download-and-install', url)
});

contextBridge.exposeInMainWorld('DontStopDiscord', {
  update: (payload) => ipcRenderer.invoke('dont-stop:discord-update', payload),
  clear: () => ipcRenderer.invoke('dont-stop:discord-clear')
});
