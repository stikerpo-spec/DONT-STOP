const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DontStopElectronUpdater', {
  downloadAndInstall: (url) => ipcRenderer.invoke('dont-stop:download-and-install', url)
});

// Optional native Discord Rich Presence. This bridge is available only inside
// the Electron desktop app; the public website and Android build remain unaffected.
contextBridge.exposeInMainWorld('DontStopElectronDiscord', {
  setActivity: (payload) => ipcRenderer.invoke('dont-stop:discord-update', payload),
  clearActivity: () => ipcRenderer.invoke('dont-stop:discord-clear')
});
