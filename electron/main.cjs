const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const https = require('node:https');
const discordPresence = require('./discord-presence.cjs');

const ALLOWED_UPDATE_HOSTS = new Set(['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']);

function downloadFile(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error('Zu viele Weiterleitungen beim Update.'));
    let parsed;
    try { parsed = new URL(url); } catch { return reject(new Error('Ungültige Update-URL.')); }
    if (parsed.protocol !== 'https:' || !ALLOWED_UPDATE_HOSTS.has(parsed.hostname)) return reject(new Error('Update-Quelle wurde aus Sicherheitsgründen abgelehnt.'));
    const request = https.get(parsed, { headers: { 'User-Agent': 'DONT-STOP-Updater/1.0', Accept: 'application/octet-stream' } }, response => {
      const status = response.statusCode || 0;
      if ([301,302,303,307,308].includes(status) && response.headers.location) { response.resume(); return downloadFile(new URL(response.headers.location, parsed).toString(), destination, redirects + 1).then(resolve, reject); }
      if (status < 200 || status >= 300) { response.resume(); return reject(new Error(`Update-Download fehlgeschlagen (HTTP ${status}).`)); }
      const output = fs.createWriteStream(destination); let settled = false;
      const fail = error => { if (settled) return; settled = true; output.destroy(); try { fs.unlinkSync(destination); } catch {} reject(error); };
      response.on('error', fail); output.on('error', fail);
      output.on('finish', () => { if (settled) return; settled = true; output.close(error => error ? reject(error) : resolve(destination)); });
      response.pipe(output);
    });
    request.on('error', reject); request.setTimeout(120000, () => request.destroy(new Error('Update-Download ist abgelaufen.')));
  });
}

ipcMain.handle('dont-stop:download-and-install', async (_event, updateUrl) => {
  if (process.platform !== 'win32') throw new Error('Der Windows-Updater ist nur unter Windows verfügbar.');
  let parsed; try { parsed = new URL(updateUrl); } catch { throw new Error('Ungültige Update-URL.'); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') throw new Error('Ungültige Update-Quelle.');
  const destination = path.join(os.tmpdir(), `DONT-STOP-update-${Date.now()}.exe`);
  await downloadFile(updateUrl, destination);
  const child = spawn(destination, ['/S'], { detached: true, stdio: 'ignore', windowsHide: true }); child.unref();
  setTimeout(() => app.quit(), 500);
  return { started: true };
});

ipcMain.handle('dont-stop:discord-update', async (_event, payload = {}) => {
  if (process.platform !== 'win32') return { ok: false };
  try { return { ok: await discordPresence.update(payload) }; } catch { return { ok: false }; }
});

ipcMain.handle('dont-stop:discord-clear', async () => {
  if (process.platform !== 'win32') return { ok: false };
  try { discordPresence.clear(); return { ok: true }; } catch { return { ok: false }; }
});

const createWindow = () => {
  const win = new BrowserWindow({ width: 560, height: 900, minWidth: 420, minHeight: 650, backgroundColor: '#050711', title: "DON'T STOP", autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') } });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'game.html'));
};

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('before-quit', () => { try { discordPresence.clear(); discordPresence.disconnect(); } catch {} });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
