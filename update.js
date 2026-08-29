(() => {
  'use strict';

  const REPO = 'stikerpo-spec/DONT-STOP';
  const BRANCH = 'main';
  const API_URL = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;
  const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/tags/`;
  const isNative = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (!isNative) return;

  function createOverlay() {
    let overlay = document.getElementById('dontStopUpdateOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'dontStopUpdateOverlay';
    overlay.innerHTML = `<style>
      #dontStopUpdateOverlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:rgba(3,5,12,.97);backdrop-filter:blur(18px);font-family:Inter,system-ui,sans-serif;color:#fff}
      #dontStopUpdateOverlay .dsu-card{width:min(470px,100%);padding:30px;border:1px solid rgba(255,255,255,.13);border-radius:28px;background:linear-gradient(145deg,rgba(18,22,40,.99),rgba(9,11,22,.99));box-shadow:0 30px 100px rgba(0,0,0,.55);text-align:center}
      #dontStopUpdateOverlay h1{margin:0 0 8px;font-size:32px;letter-spacing:-.04em}
      #dontStopUpdateOverlay p{margin:0 0 20px;color:#aeb6c9;line-height:1.55}
      #dontStopUpdateOverlay .dsu-version{display:inline-flex;margin:0 0 20px;padding:8px 12px;border-radius:999px;background:rgba(109,92,255,.12);border:1px solid rgba(109,92,255,.3);font-size:12px;font-weight:800}
      #dontStopUpdateOverlay .dsu-buttons{display:grid;gap:10px}
      #dontStopUpdateOverlay button{min-height:48px;border:1px solid rgba(255,255,255,.12);border-radius:15px;padding:13px 16px;font:800 14px inherit;color:#fff;background:rgba(255,255,255,.05);cursor:pointer;display:grid;place-items:center}
      #dontStopUpdateOverlay .primary{background:linear-gradient(135deg,#6d5cff,#a04dff);border-color:transparent}
      #dontStopUpdateOverlay .danger{background:rgba(255,78,120,.1);border-color:rgba(255,78,120,.28)}
      #dontStopUpdateOverlay .muted{font-size:11px;color:#727c96;margin-top:12px}
      #dontStopUpdateOverlay .progress{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:12px 0 18px}
      #dontStopUpdateOverlay .bar{height:100%;width:0;background:linear-gradient(90deg,#6d5cff,#20e3b2);transition:width .2s ease}
    </style><div class="dsu-card"><div class="dsu-version">UPDATE-SYSTEM • IN APP</div><h1>Update wird geprüft …</h1><p>DON’T STOP prüft vor dem Start, ob eine neuere App-Version verfügbar ist.</p><div class="dsu-buttons"></div><div class="muted">DON’T STOP • Update-System</div></div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  const removeOverlay = () => document.getElementById('dontStopUpdateOverlay')?.remove();

  function show({ title, text, version = 'UPDATE', buttons = '' }) {
    const o = createOverlay();
    const c = o.querySelector('.dsu-card');
    c.querySelector('h1').textContent = title;
    c.querySelector('p').textContent = text;
    c.querySelector('.dsu-version').textContent = version;
    c.querySelector('.dsu-buttons').innerHTML = buttons;
  }

  function localBuild() {
    const b = window.DontStopBuild || {};
    return { version: String(b.version || 'unknown'), commit: String(b.commit || '').trim() };
  }

  function detectPlatform() {
    if (/Android/i.test(navigator.userAgent)) return 'android';
    if (/Windows/i.test(navigator.userAgent) || location.protocol === 'file:') return 'windows';
    return 'unknown';
  }

  function nativeUpdater() {
    return window.Capacitor?.Plugins?.DontStopUpdater || null;
  }

  function electronUpdater() {
    return window.DontStopElectronUpdater || null;
  }

  async function resolveReleaseAsset(platform) {
    const tag = platform === 'android' ? 'android-latest' : 'windows-latest';
    const response = await fetch(`${RELEASE_API}${tag}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error(`Release ${response.status}`);
    const release = await response.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const pattern = platform === 'android' ? /^DONT-STOP-v.+-build\d+\.apk$/i : /^DONT-STOP-Setup-v.+-build\d+\.exe$/i;
    const matches = assets.filter(asset => pattern.test(String(asset?.name || '')) && asset?.browser_download_url);
    if (!matches.length) throw new Error('Kein passender Installer im aktuellen Release gefunden.');

    matches.sort((a, b) => {
      const na = Number(String(a.name).match(/build(\d+)/i)?.[1] || 0);
      const nb = Number(String(b.name).match(/build(\d+)/i)?.[1] || 0);
      return nb - na;
    });

    return matches[0].browser_download_url;
  }

  async function startNativeInstall(platform, url) {
    if (platform === 'android') {
      const plugin = nativeUpdater();
      if (plugin?.downloadAndInstall) {
        return plugin.downloadAndInstall({ url, fileName: 'DONT-STOP-update.apk' });
      }
    }

    if (platform === 'windows') {
      const updater = electronUpdater();
      if (updater?.downloadAndInstall) {
        return updater.downloadAndInstall(url);
      }
    }

    throw new Error('Native Update-Installer ist in dieser App-Version nicht verfügbar.');
  }

  function showInstalling(platform) {
    const o = createOverlay();
    const c = o.querySelector('.dsu-card');
    c.querySelector('h1').textContent = 'Update wird installiert …';
    c.querySelector('p').textContent = platform === 'android'
      ? 'Die neue Android-Version wird direkt heruntergeladen. Danach öffnet sich der System-Installer.'
      : 'Der neue Windows-Installer wird direkt heruntergeladen und gestartet.';
    c.querySelector('.dsu-version').textContent = 'UPDATE LÄUFT';
    c.querySelector('.dsu-buttons').innerHTML = `<div class="progress"><div class="bar" id="dontStopUpdateBar"></div></div>`;
    const bar = document.getElementById('dontStopUpdateBar');
    let progress = 8;
    const timer = setInterval(() => {
      progress = Math.min(progress + Math.random() * 7, 92);
      if (bar) bar.style.width = `${progress}%`;
    }, 350);
    return () => clearInterval(timer);
  }

  async function check() {
    const local = localBuild();

    try {
      const response = await fetch(`${API_URL}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!response.ok) throw new Error(`GitHub ${response.status}`);
      const data = await response.json();
      const remote = String(data.sha || '').trim();
      if (!remote || !local.commit || local.commit === remote) {
        removeOverlay();
        return;
      }

      const platform = detectPlatform();
      if (platform === 'unknown') {
        removeOverlay();
        return;
      }

      const url = await resolveReleaseAsset(platform);
      show({
        title: 'Update verfügbar',
        text: 'Eine neue DON’T STOP-Version wurde veröffentlicht. Das Update kann direkt in der App installiert werden.',
        version: `${local.version} → NEU`,
        buttons: `<button class="primary" id="dontStopUpdateStart">UPDATE HERUNTERLADEN & INSTALLIEREN</button>`
      });

      document.getElementById('dontStopUpdateStart').onclick = async () => {
        let stopProgress = () => {};
        try {
          stopProgress = showInstalling(platform);
          await startNativeInstall(platform, url);
        } catch (error) {
          stopProgress();
          show({
            title: 'Update konnte nicht installiert werden',
            text: error?.message || 'Der Download oder die Installation ist fehlgeschlagen.',
            version: 'UPDATE-FEHLER',
            buttons: `<button id="dontStopUpdateClose" class="danger">SCHLIESSEN</button>`
          });
          document.getElementById('dontStopUpdateClose').onclick = removeOverlay;
        }
      };
    } catch {
      removeOverlay();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    createOverlay();
    check();
  }, { once: true });
})();
