(() => {
  'use strict';

  const REPO = 'stikerpo-spec/DONT-STOP';
  const BRANCH = 'main';
  const RELEASES = 'https://github.com/stikerpo-spec/DONT-STOP/releases';
  const ANDROID_DOWNLOAD = `${RELEASES}/download/android-latest/DONT-STOP.apk`;
  const WINDOWS_DOWNLOAD = `${RELEASES}/download/windows-latest/DONT-STOP-Setup.exe`;
  const API_URL = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;
  const isNative = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (!isNative) return;

  const escapeHtml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function createOverlay() {
    let overlay = document.getElementById('dontStopUpdateOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'dontStopUpdateOverlay';
    overlay.innerHTML = `<style>
      #dontStopUpdateOverlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:rgba(3,5,12,.96);backdrop-filter:blur(18px);font-family:Inter,system-ui,sans-serif;color:#fff}
      #dontStopUpdateOverlay .dsu-card{width:min(460px,100%);padding:30px;border:1px solid rgba(255,255,255,.13);border-radius:28px;background:linear-gradient(145deg,rgba(18,22,40,.99),rgba(9,11,22,.99));box-shadow:0 30px 100px rgba(0,0,0,.55);text-align:center}
      #dontStopUpdateOverlay h1{margin:0 0 8px;font-size:32px;letter-spacing:-.04em}#dontStopUpdateOverlay p{margin:0 0 20px;color:#aeb6c9;line-height:1.55}
      #dontStopUpdateOverlay .dsu-version{display:inline-flex;margin:0 0 20px;padding:8px 12px;border-radius:999px;background:rgba(109,92,255,.12);border:1px solid rgba(109,92,255,.3);font-size:12px;font-weight:800}
      #dontStopUpdateOverlay .dsu-buttons{display:grid;gap:10px}#dontStopUpdateOverlay button,#dontStopUpdateOverlay a{min-height:48px;border:1px solid rgba(255,255,255,.12);border-radius:15px;padding:13px 16px;font:800 14px inherit;color:#fff;background:rgba(255,255,255,.05);text-decoration:none;cursor:pointer;display:grid;place-items:center}
      #dontStopUpdateOverlay .primary{background:linear-gradient(135deg,#6d5cff,#a04dff);border-color:transparent}#dontStopUpdateOverlay .muted{font-size:11px;color:#727c96;margin-top:12px}
    </style><div class="dsu-card"><div class="dsu-version">UPDATE-SYSTEM • GITHUB</div><h1>Update wird geprüft …</h1><p>DON’T STOP prüft vor dem Start, ob eine neuere App-Version verfügbar ist.</p><div class="dsu-buttons"></div><div class="muted">DON’T STOP • Update-System</div></div>`;
    document.body.appendChild(overlay);
    return overlay;
  }
  const removeOverlay = () => document.getElementById('dontStopUpdateOverlay')?.remove();
  function show({title,text,version='UPDATE',buttons=''}) { const o=createOverlay(), c=o.querySelector('.dsu-card'); c.querySelector('h1').textContent=title; c.querySelector('p').textContent=text; c.querySelector('.dsu-version').textContent=version; c.querySelector('.dsu-buttons').innerHTML=buttons; }

  function localBuild() {
    const b = window.DontStopBuild || {};
    return { version:String(b.version || 'unknown'), commit:String(b.commit || '').trim() };
  }

  function detectPlatform() { return /Android/i.test(navigator.userAgent) ? 'android' : 'windows'; }

  async function check() {
    const local = localBuild();
    if (!local.commit || local.commit === 'SOURCE_BUILD') { removeOverlay(); return; }
    try {
      const response = await fetch(`${API_URL}?t=${Date.now()}`, { cache:'no-store', headers:{Accept:'application/vnd.github+json'} });
      if (!response.ok) throw new Error(`GitHub ${response.status}`);
      const data = await response.json();
      const remote = String(data.sha || '').trim();
      if (!remote) throw new Error('Keine Commit-ID');
      if (remote === local.commit) { removeOverlay(); return; }

      const platform = detectPlatform();
      const isAndroid = platform === 'android';
      const url = isAndroid ? ANDROID_DOWNLOAD : WINDOWS_DOWNLOAD;
      const label = isAndroid ? 'NEUE APK HERUNTERLADEN' : 'NEUEN WINDOWS-INSTALLER HERUNTERLADEN';
      show({
        title:'Update erforderlich',
        text:'Eine neue Version von DON’T STOP wurde auf GitHub veröffentlicht. Bitte installiere das Update, bevor du weiterspielst.',
        version:`${escapeHtml(local.version)} → ${escapeHtml(remote.slice(0,7))}`,
        buttons:`<a class="primary" href="${url}" target="_blank" rel="noopener">${label}</a>`
      });
    } catch {
      // Ohne Internet bleibt die zuletzt installierte Version spielbar.
      removeOverlay();
    }
  }

  document.addEventListener('DOMContentLoaded', () => { createOverlay(); check(); }, { once:true });
})();
