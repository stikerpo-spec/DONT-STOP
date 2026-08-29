const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const https = require('node:https');

const ALLOWED_UPDATE_HOSTS = new Set(['github.com', 'objects.githubusercontent.com']);

function downloadFile(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Zu viele Weiterleitungen beim Update.'));

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return reject(new Error('Ungültige Update-URL.'));
    }

    if (!['https:', 'http:'].includes(parsed.protocol) || !ALLOWED_UPDATE_HOSTS.has(parsed.hostname)) {
      return reject(new Error('Update-Quelle wurde aus Sicherheitsgründen abgelehnt.'));
    }

    const request = https.get(parsed, { headers: { 'User-Agent': 'DON-T-STOP-Updater' } }, response => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        return downloadFile(new URL(response.headers.location, parsed).toString(), destination, redirects + 1)
          .then(resolve, reject);
      }
      if (status < 200 || status >= 300) {
        response.resume();
        return reject(new Error(`GitHub-Download fehlgeschlagen (HTTP ${status}).`));
      }

      const output = fs.createWriteStream(destination);
      let finished = false;
      const fail = error => {
        if (finished) return;
        finished = true;
        output.destroy();
        fs.rm(destination, { force: true }, () => {});
        reject(error);
      };

      response.on('error', fail);
      output.on('error', fail);
      output.on('finish', () => {
        if (finished) return;
        finished = true;
        output.close(error => error ? reject(error) : resolve(destination));
      });
      response.pipe(output);
    });

    request.on('error', reject);
    request.setTimeout(120000, () => {
      request.destroy(new Error('Update-Download ist abgelaufen.'));
    });
  });
}

ipcMain.handle('dont-stop:download-and-install', async (_event, updateUrl) => {
  if (process.platform !== 'win32') {
    throw new Error('Der Windows-Updater ist nur unter Windows verfügbar.');
  }

  const parsed = new URL(updateUrl);
  if (parsed.hostname !== 'github.com') {
    throw new Error('Ungültige Update-Quelle.');
  }

  const destination = path.join(os.tmpdir(), `DONT-STOP-update-${Date.now()}.exe`);
  await downloadFile(updateUrl, destination);

  // Starte den NSIS-Installer getrennt und schließe die laufende App zuerst.
  const child = spawn(destination, ['/S'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();

  setTimeout(() => app.quit(), 300);
  return { started: true };
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 560,
    height: 900,
    minWidth: 420,
    minHeight: 650,
    backgroundColor: '#050711',
    title: "DON'T STOP",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'index.html'));
};

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
