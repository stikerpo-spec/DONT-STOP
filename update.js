(() => {
  'use strict';

  // Updater is isolated from gameplay. It only adds a small update button when a newer build exists.
  const RAW = 'https://raw.githubusercontent.com/stikerpo-spec/DONT-STOP/main/build-info.js';
  const WINDOWS = 'https://github.com/stikerpo-spec/DONT-STOP/releases/download/windows-latest/DONT-STOP-Setup.exe';
  const ANDROID = 'https://github.com/stikerpo-spec/DONT-STOP/releases/download/android-latest/DONT-STOP.apk';

  const isNative = () => !location.hostname.endsWith('.github.io') &&
    (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /Capacitor/i.test(navigator.userAgent));

  const semver = value => String(value || '0.0.0').split('.').map(x => Math.max(0, Number.parseInt(x, 10) || 0));
  const compareVersion = (a, b) => {
    const x = semver(a), y = semver(b);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  };

  const localBuild = () => {
    const b = window.DontStopBuild || {};
    return { version: String(b.version || '0.0.0'), run: Number(b.run || 0) };
  };

  const remoteBuild = text => {
    const vm = text.match(/version:\s*['\"]([^'\"]+)['\"]/);
    const rm = text.match(/run:\s*(\d+)/);
    return { version: vm?.[1] || '0.0.0', run: Number(rm?.[1] || 0) };
  };

  const hasUpdate = (remote, local) => {
    const versionDiff = compareVersion(remote.version, local.version);
    if (versionDiff > 0) return true;
    if (versionDiff < 0) return false;
    return Boolean(local.run) && Boolean(remote.run) && remote.run > local.run;
  };

  function makeButton(latest) {
    if (document.getElementById('dsUpdateButton')) return;
    const button = document.createElement('button');
    button.id = 'dsUpdateButton';
    button.type = 'button';
    button.textContent = `UPDATE ${latest.version}`;
    Object.assign(button.style, {
      position: 'fixed', right: '14px', top: '14px', zIndex: '900', minHeight: '42px',
      padding: '0 14px', border: '0', borderRadius: '12px',
      background: 'linear-gradient(135deg,#735cff,#a24dff)', color: '#fff',
      font: '800 12px system-ui', cursor: 'pointer', touchAction: 'manipulation',
      boxShadow: '0 8px 25px rgba(0,0,0,.25)'
    });
    button.onclick = async () => {
      button.disabled = true;
      button.textContent = 'UPDATE LÄDT…';
      const android = /Android|Capacitor/i.test(navigator.userAgent);
      const url = android ? ANDROID : WINDOWS;
      try {
        if (android && window.Capacitor?.registerPlugin) {
          const updater = window.Capacitor.registerPlugin('DontStopUpdater');
          if (updater?.downloadAndInstall) {
            await updater.downloadAndInstall({ url, fileName: 'DONT-STOP.apk' });
            return;
          }
        }
        if (!android && window.DontStopElectronUpdater?.downloadAndInstall) {
          await window.DontStopElectronUpdater.downloadAndInstall(url);
          return;
        }
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        button.disabled = false;
        button.textContent = 'UPDATE ERNEUT VERSUCHEN';
      } catch (error) {
        console.error("DON'T STOP update failed", error);
        button.disabled = false;
        button.textContent = 'UPDATE ERNEUT VERSUCHEN';
      }
    };
    document.body.appendChild(button);
  }

  async function check() {
    if (!isNative()) return;
    try {
      const response = await fetch(`${RAW}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const latest = remoteBuild(await response.text());
      if (hasUpdate(latest, localBuild())) makeButton(latest);
    } catch (error) {
      console.debug('Update check skipped:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(check, 1200), { once: true });
  else setTimeout(check, 1200);
})();
