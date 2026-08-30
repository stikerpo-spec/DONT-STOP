(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const overlay = $('overlay');
  const startBtn = $('startBtn');
  const resumeBtn = $('resumeBtn');
  const leftBtn = $('leftBtn');
  const rightBtn = $('rightBtn');
  const jumpBtn = $('jumpBtn');
  if (!overlay || !startBtn || !leftBtn || !rightBtn || !jumpBtn) return;

  let started = false;
  const nativeStart = window.DontStopGameStart;
  const start = () => {
    if (started) return;
    started = true;
    overlay.classList.add('hidden');
    document.documentElement.classList.add('game-started');
    try {
      if (typeof window.DontStopStartRun === 'function') window.DontStopStartRun();
    } catch {}
    try {
      if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('dontstop:start-run'));
    } catch {}
  };

  startBtn.addEventListener('click', start, {capture: true});
  if (resumeBtn) resumeBtn.addEventListener('click', start, {capture: true});
  [leftBtn, rightBtn, jumpBtn].forEach(btn => btn.addEventListener('pointerdown', e => e.stopPropagation(), {passive:true}));

  // A failed optional visual layer must never leave the menu unusable.
  window.setTimeout(() => {
    if (!started && overlay.classList.contains('hidden')) return;
    startBtn.disabled = false;
    startBtn.style.pointerEvents = 'auto';
  }, 400);
})();
