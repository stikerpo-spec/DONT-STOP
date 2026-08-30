const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DontStopElectronUpdater', {
  downloadAndInstall: (url) => ipcRenderer.invoke('dont-stop:download-and-install', url)
});

contextBridge.exposeInMainWorld('DontStopElectronDiscord', {
  setActivity: (payload) => ipcRenderer.invoke('dont-stop:discord-update', payload),
  clearActivity: () => ipcRenderer.invoke('dont-stop:discord-clear')
});

// Backward-compatible alias for older builds.
contextBridge.exposeInMainWorld('DontStopDiscord', {
  update: (payload) => ipcRenderer.invoke('dont-stop:discord-update', payload),
  clear: () => ipcRenderer.invoke('dont-stop:discord-clear')
});
