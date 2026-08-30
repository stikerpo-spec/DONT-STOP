(() => {
  'use strict';
  if (!location.pathname.endsWith('/game.html')) return;
  const api = window.DontStopElectronDiscord;
  if (!api?.setActivity) return;

  let last = '';
  let startedAt = Math.floor(Date.now() / 1000);
  let active = false;
  let timer = null;

  function text(id) { return document.getElementById(id)?.textContent?.trim() || ''; }

  function getSnapshot() {
    const overlay = document.getElementById('overlay');
    const hidden = overlay?.classList.contains('hidden') === true;
    const level = text('level') || '1 • NORMAL';
    const score = text('score') || '0';
    const match = level.match(/^(\d+)\s*[•·]\s*(.*)$/);
    return {
      playing: hidden,
      level: match ? match[1] : level,
      levelName: match ? match[2] : '',
      score
    };
  }

  async function sync() {
    const s = getSnapshot();
    if (s.playing) {
      if (!active) {
        active = true;
        startedAt = Math.floor(Date.now() / 1000);
      }
      const details = `Level ${s.level}${s.levelName ? ` • ${s.levelName}` : ''}`;
      const activityState = `Score: ${s.score}`;
      const key = `${details}|${activityState}|${startedAt}`;
      if (key !== last) {
        last = key;
        try { await api.setActivity({ details, state: activityState, startedAt }); } catch {}
      }
      return;
    }
    if (active) {
      active = false;
      last = '';
      try { await api.clearActivity(); } catch {}
    }
  }

  function start() {
    sync();
    clearInterval(timer);
    timer = setInterval(sync, 10000);
  }

  window.addEventListener('pagehide', () => {
    try { api.clearActivity(); } catch {}
    clearInterval(timer);
  }, { once: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
