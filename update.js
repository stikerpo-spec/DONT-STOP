(() => {
  'use strict';

  const REPO = 'stikerpo-spec/DONT-STOP';
  const BRANCH = 'main';
  const RELEASES = 'https://github.com/stikerpo-spec/DONT-STOP/releases';
  const ANDROID = `${RELEASES}/tag/android-latest`;
  const WINDOWS = `${RELEASES}/tag/windows-latest`;
  const STORAGE_KEY = 'dont-stop-installed-commit-v1';
  const API_URL = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;

  const isNative = location.protocol === 'file:' || /(?:^|:)\/\/localhost/.test(location.origin);

  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function createOverlay() {
    let overlay = document.getElementById('dontStopUpdateOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'dontStopUpdateOverlay';
    overlay.innerHTML = `
      <style>
        #dontStopUpdateOverlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:rgba(3,5,12,.94);backdrop-filter:blur(18px);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
        #dontStopUpdateOverlay .dsu-card{width:min(460px,100%);padding:30px;border:1px solid rgba(255,255,255,.13);border-radius:28px;background:linear-gradient(145deg,rgba(18,22,40,.98),rgba(9,11,22,.98));box-shadow:0 30px 100px rgba(0,0,0,.55);text-align:center}
        #dontStopUpdateOverlay h1{margin:0 0 8px;font-size:32px;letter-spacing:-.04em}
        #dontStopUpdateOverlay p{margin:0 0 20px;color:#aeb6c9;line-height:1.55}
        #dontStopUpdateOverlay .dsu-version{display:inline-flex;margin:0 0 20px;padding:8px 12px;border-radius:999px;background:rgba(109,92,255,.12);border:1px solid rgba(109,92,255,.3);font-size:12px;font-weight:800}
        #dontStopUpdateOverlay .dsu-buttons{display:grid;gap:10px}
        #dontStopUpdateOverlay button,#dontStopUpdateOverlay a{min-height:48px;border:1px solid rgba(255,255,255,.12);border-radius:15px;padding:13px 16px;font:800 14px inherit;color:#fff;background:rgba(255,255,255,.05);text-decoration:none;cursor:pointer;display:grid;place-items:center}
        #dontStopUpdateOverlay .primary{background:linear-gradient(135deg,#6d5cff,#a04dff);border-color:transparent}
        #dontStopUpdateOverlay .muted{font-size:11px;color:#727c96;margin-top:12px}
      </style>
      <div class="dsu-card">
        <div class="dsu-version">UPDATE-SYSTEM • GITHUB</div>
        <h1>Update wird geprüft …</h1>
        <p>DON’T STOP prüft beim Start, ob auf GitHub eine neuere Version vorhanden ist.</p>
        <div class="dsu-buttons"></div>
        <div class="muted">Bitte das Spiel während der Prüfung nicht schließen.</div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function removeOverlay() {
    document.getElementById('dontStopUpdateOverlay')?.remove();
  }

  function setOverlay({ title, text, version = '', buttons = '' }) {
    const overlay = createOverlay();
    const card = overlay.querySelector('.dsu-card');
    card.querySelector('h1').textContent = title;
    card.querySelector('p').textContent = text;
    card.querySelector('.dsu-version').textContent = version || 'UPDATE-SYSTEM • GITHUB';
    card.querySelector('.dsu-buttons').innerHTML = buttons;
    card.querySelector('.muted').textContent = 'DON’T STOP • Update-System';
  }

  function getStoredCommit() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
  }

  function storeCommit(sha) {
    try { localStorage.setItem(STORAGE_KEY, sha); } catch {}
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return null;
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      await registration.update();
      return registration;
    } catch {
      return null;
    }
  }

  async function clearAppCaches() {
    if (!('caches' in window)) return;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith('dont-stop-')).map(key => caches.delete(key)));
    } catch {}
  }

  function nativeUpdateButtons() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const href = isAndroid ? ANDROID : WINDOWS;
    const label = isAndroid ? 'ANDROID-UPDATE ÖFFNEN' : 'WINDOWS-UPDATE ÖFFNEN';
    return `<a class="primary" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  }

  async function checkForUpdate() {
    const overlay = createOverlay();
    const stored = getStoredCommit();

    try {
      const response = await fetch(`${API_URL}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
      const data = await response.json();
      const remoteSha = String(data.sha || '').trim();
      if (!remoteSha) throw new Error('Keine Commit-ID erhalten');

      const shortRemote = remoteSha.slice(0, 7);
      const shortInstalled = stored ? stored.slice(0, 7) : '';

      if (!stored) {
        storeCommit(remoteSha);
        removeOverlay();
        return;
      }

      if (stored === remoteSha) {
        removeOverlay();
        return;
      }

      setOverlay({
        title: 'Update erforderlich',
        text: `Auf GitHub gibt es eine neue Spielversion. Erst nach dem Update kannst du DON’T STOP weiter öffnen.`,
        version: `NEU ${escapeHtml(shortRemote)} • ALT ${escapeHtml(shortInstalled)}`,
        buttons: isNative
          ? `${nativeUpdateButtons()}`
          : `<button id="dsuUpdateBtn" class="primary">SPIEL AKTUALISIEREN</button>`
      });

      if (!isNative) {
        document.getElementById('dsuUpdateBtn')?.addEventListener('click', async () => {
          storeCommit(remoteSha);
          setOverlay({
            title: 'Update wird installiert …',
            text: 'Der alte Cache wird gelöscht und die aktuelle GitHub-Version wird geladen.',
            version: `UPDATE ${escapeHtml(shortRemote)}`,
            buttons: ''
          });
          await clearAppCaches();
          try { await navigator.serviceWorker?.getRegistration()?.then(reg => reg?.update()); } catch {}
          location.reload();
        });
      }
    } catch {
      // Offline/temporär nicht erreichbar: vorhandenes Spiel bleibt nutzbar.
      removeOverlay();
    }

    return overlay;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await registerServiceWorker();
    await checkForUpdate();
  }, { once: true });
})();
