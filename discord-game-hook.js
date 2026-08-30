(() => {
  'use strict';
  const presence = window.DontStopDiscordPresence;
  const start = document.getElementById('startBtn');
  const resume = document.getElementById('resumeBtn');
  const overlay = document.getElementById('overlay');
  const score = document.getElementById('score');
  const level = document.getElementById('level');
  if (!presence || !start || !resume || !overlay) return;

  let timer = 0;
  let active = false;

  const read = () => {
    let saved = {};
    try { saved = window.DontStopSave?.read?.() || {}; } catch {}
    const world = String(saved.progression?.world || 'city').replaceAll('_', ' ');
    const levelText = String(level?.textContent || '1').split('•')[0].trim();
    return {
      level: Number(levelText) || 1,
      world,
      score: Number(String(score?.textContent || '0').replace(/[^0-9]/g, '')) || 0,
      elapsed: Number(saved.progress?.activeRun?.elapsed || 0)
    };
  };

  const push = () => {
    if (!active) return;
    const d = read();
    presence.update({
      details: `DON'T STOP • Level ${d.level}`,
      state: `${d.world.toUpperCase()} • Score ${d.score.toLocaleString('de-DE')}`,
      elapsed: d.elapsed
    }, false);
  };

  const begin = () => {
    active = true;
    presence.start(read());
    clearInterval(timer);
    timer = setInterval(push, 10000);
  };

  const checkGameOver = () => {
    if (active && !overlay.classList.contains('hidden') && start.hidden === false) {
      // Overlay becomes visible for pause/game-over. Keep presence briefly for pause,
      // but stop it when the game-over message contains a score summary.
      const text = String(document.getElementById('overlayText')?.textContent || '');
      if (/Score:|Hindernis getroffen|NEUER REKORD/i.test(text)) {
        active = false;
        clearInterval(timer);
        presence.stop();
      }
    }
  };

  start.addEventListener('click', begin, { passive: true });
  resume.addEventListener('click', begin, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && active) push(); });
  setInterval(checkGameOver, 1000);
  window.addEventListener('pagehide', () => { if (active) presence.stop(); }, { once: true });
})();
