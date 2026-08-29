(() => {
  'use strict';

  const REPO = 'stikerpo-spec/DONT-STOP';
  const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/tags/`;
  const DOWNLOAD_URLS = {
    windows: `https://github.com/${REPO}/releases/download/windows-latest/DONT-STOP-Setup.exe`,
    android: `https://github.com/${REPO}/releases/download/android-latest/DONT-STOP.apk`
  };
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
      #dontStopUpdateOverlay button,#dontStopUpdateOverlay a{min-height:48px;border:1px solid rgba(255,255,255,.12);border-radius:15px;padding:13px 16px;font:800 14px inherit;color:#fff;background:rgba(255,255,255,.05);cursor:pointer;display:grid;place-items:center;text-decoration:none}
      #dontStopUpdateOverlay .primary{background:linear-gradient(135deg,#6d5cff,#a04dff);border-color:transparent}
      #dontStopUpdateOverlay .danger{background:rgba(255,78,120,.1);border-color:rgba(255,78,120,.28)}
      #dontStopUpdateOverlay .muted{font-size:11px;color:#727c96;margin-top:12px;word-break:break-word}
      #dontStopUpdateOverlay .progress{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:12px 0 18px}
      #dontStopUpdateOverlay .bar{height:100%;width:5%;background:linear-gradient(90deg,#6d5cff,#20e3b2);transition:width .2s ease}
    </style><div class="dsu-card"><div class="dsu-version">UPDATE-SYSTEM • IN APP</div><h1>Update wird geprüft …</h1><p>DON’T STOP sucht nach dem neuesten Installer.</p><div class="dsu-buttons"></div><div class="muted">DON’T STOP • Update-System</div></div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  const removeOverlay = () => document.getElementById('dontStopUpdateOverlay')?.remove();

  function show({ title, text, version = 'UPDATE', buttons = '', muted = '' }) {
    const o = createOverlay();
    const c = o.querySelector('.dsu-card');
    c.querySelector('h1').textContent = title;
    c.querySelector('p').textContent = text;
    c.querySelector('.dsu-version').textContent = version;
    c.querySelector('.dsu-buttons').innerHTML = buttons;
    c.querySelector('.muted').textContent = muted || 'DON’T STOP • Update-System';
  }

  function localBuild() {
    const b = window.DontStopBuild || {};
    return {
      version: String(b.version || 'unknown'),
      commit: String(b.commit || '').trim(),
      run: Number(b.run || 0)
    };
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

  async function getLatestRelease(platform) {
    const tag = platform === 'android' ? 'android-latest' : 'windows-latest';
    const response = await fetch(`${RELEASE_API}${tag}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error(`GitHub Release antwortete mit HTTP ${response.status}.`);
    const release = await response.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const pattern = platform === 'android'
      ? /^DONT-STOP-v.+-build(\d+)\.apk$/i
      : /^DONT-STOP-Setup-v.+-build(\d+)\.exe$/i;
    const versioned = assets
      .map(asset => ({ asset, match: String(asset?.name || '').match(pattern) }))
      .filter(item => item.match && item.asset?.browser_download_url)
      .map(item => ({ ...item.asset, build: Number(item.match[1]) }));
    if (!versioned.length) {
      throw new Error('Noch kein aktueller Installer wurde im Release veröffentlicht.');
    }
    versioned.sort((a, b) => b.build - a.build);
    const latest = versioned[0];
    return {
      build: latest.build,
      version: String(latest.name).match(/v(.+)-build/i)?.[1] || 'unbekannt',
      stableUrl: `${DOWNLOAD_URLS[platform]}?t=${Date.now()}`,
      assetUrl: latest.browser_download_url
    };
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

    throw new Error('Diese installierte App enthält noch keinen nativen Update-Installer.');
  }

  function showInstalling(platform) {
    const o = createOverlay();
    const c = o.querySelector('.dsu-card');
    c.querySelector('h1').textContent = 'Update wird installiert …';
    c.querySelector('p').textContent = platform === 'android'
      ? 'Die neue APK wird geladen. Danach öffnet sich der Android-Installer.'
      : 'Der neue Windows-Installer wird geladen und gestartet.';
    c.querySelector('.dsu-version').textContent = 'UPDATE LÄUFT';
    c.querySelector('.dsu-buttons').innerHTML = `<div class="progress"><div class="bar" id="dontStopUpdateBar"></div></div>`;
    let progress = 5;
    const timer = setInterval(() => {
      progress = Math.min(progress + Math.random() * 8, 92);
      const bar = document.getElementById('dontStopUpdateBar');
      if (bar) bar.style.width = `${progress}%`;
    }, 350);
    return () => clearInterval(timer);
  }

  async function check() {
    const local = localBuild();
    const platform = detectPlatform();
    if (platform === 'unknown') {
      removeOverlay();
      return;
    }

    try {
      const latest = await getLatestRelease(platform);
      const updateAvailable = !local.run || latest.build > local.run || (local.version !== latest.version && local.version !== 'unknown');
      if (!updateAvailable) {
        removeOverlay();
        return;
      }

      show({
        title: 'Update verfügbar',
        text: `Eine neue DON’T STOP-Version ist verfügbar. Sie wird direkt aus der App installiert.`,
        version: `${local.version} → ${latest.version} • Build ${latest.build}`,
        buttons: `<button class="primary" id="dontStopUpdateStart">UPDATE HERUNTERLADEN & INSTALLIEREN</button>`
      });

      document.getElementById('dontStopUpdateStart').onclick = async () => {
        let stopProgress = () => {};
        try {
          stopProgress = showInstalling(platform);
          await startNativeInstall(platform, latest.stableUrl);
        } catch (error) {
          stopProgress();
          show({
            title: 'Update fehlgeschlagen',
            text: error?.message || 'Die Update-Datei konnte nicht geladen oder installiert werden.',
            version: 'UPDATE-FEHLER',
            buttons: `<button id="dontStopUpdateRetry" class="primary">ERNEUT VERSUCHEN</button><button id="dontStopUpdateClose" class="danger">SCHLIESSEN</button>`,
            muted: 'Prüfe Internetverbindung und ob die neueste App-Version installiert ist.'
          });
          document.getElementById('dontStopUpdateRetry').onclick = () => check();
          document.getElementById('dontStopUpdateClose').onclick = removeOverlay;
        }
      };
    } catch (error) {
      show({
        title: 'Update-Prüfung fehlgeschlagen',
        text: error?.message || 'Der Update-Server konnte nicht erreicht werden.',
        version: 'UPDATE-PRÜFUNG',
        buttons: `<button id="dontStopUpdateRetry" class="primary">ERNEUT VERSUCHEN</button><button id="dontStopUpdateClose" class="danger">SCHLIESSEN</button>`
      });
      document.getElementById('dontStopUpdateRetry').onclick = () => check();
      document.getElementById('dontStopUpdateClose').onclick = removeOverlay;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    createOverlay();
    check();
  }, { once: true });
})();
