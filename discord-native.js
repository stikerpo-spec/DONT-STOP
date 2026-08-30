(() => {
  'use strict';

  // Native-only Discord Rich Presence bridge.
  // On the public website and on Android this file does nothing.
  const bridge = window.DontStopElectronDiscord || window.DontStopDiscord;
  if (!bridge) return;

  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const score = document.getElementById('score');
  const level = document.getElementById('level');
  if (!startBtn || !resumeBtn || !overlay || !overlayText) return;

  let timer = 0;
  let active = false;
  let startedAt = 0;

  const getData = () => {
    let saved = {};
    try { saved = window.DontStopSave?.read?.() || {}; } catch {}
    const activeRun = saved.progress?.activeRun || {};
    const levelText = String(level?.textContent || '1').split('•')[0].trim();
    const scoreText = String(score?.textContent || '0').replace(/[^0-9]/g, '');
    return {
      level: Number(levelText) || 1,
      world: String(saved.progression?.world || 'city').replaceAll('_', ' '),
      score: Number(scoreText) || 0,
      elapsed: Number(activeRun.elapsed || 0)
    };
  };

  const send = async (status = 'Spielt gerade') => {
    if (!active) return;
    const d = getData();
    try {
      await bridge.setActivity?.({
        details: `DON'T STOP • Level ${d.level}`,
        state: `${d.world.toUpperCase()} • Score ${d.score.toLocaleString('de-DE')} • ${status}`,
        startedAt: startedAt || Math.floor(Date.now() / 1000)
      });
    } catch {}
  };

  const begin = () => {
    active = true;
    const d = getData();
    startedAt = Math.floor(Date.now() / 1000) - Math.max(0, Math.floor(d.elapsed));
    send();
    clearInterval(timer);
    timer = setInterval(() => send(), 8000);
  };

  const stop = () => {
    active = false;
    clearInterval(timer);
    try { bridge.clearActivity?.(); bridge.clear?.(); } catch {}
  };

  startBtn.addEventListener('click', () => setTimeout(begin, 60));
  resumeBtn.addEventListener('click', () => setTimeout(begin, 60));

  const observer = new MutationObserver(() => {
    if (!active) return;
    if (!overlay.classList.contains('hidden')) {
      const text = String(overlayText.textContent || '');
      if (/Run gespeichert|Score:|Hindernis getroffen|NEUER REKORD|Getroffen/i.test(text)) {
        stop();
      }
    }
  });
  observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('pagehide', stop, { once: true });
})();
