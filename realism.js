(() => {
  'use strict';

  const canvas = document.getElementById('scene');
  const game = document.querySelector('.game');
  if (!canvas || !game) return;

  const atmosphere = document.createElement('div');
  atmosphere.className = 'atmosphere';
  atmosphere.innerHTML = '<div class="horizon"></div><div class="vignette"></div><div class="speed-lines"></div><div class="dust"></div>';
  game.insertBefore(atmosphere, game.firstChild);

  const username = (() => {
    try { return localStorage.getItem('dontStopSessionV1') || ''; } catch { return ''; }
  })();
  if (username) {
    const name = document.createElement('div');
    name.className = 'runner-name';
    name.textContent = username;
    game.appendChild(name);
  }

  const update = () => {
    const save = window.DontStopSave?.read?.() || {};
    const level = Math.max(1, Math.min(5, Number(save.selectedLevel) || 1));
    const intensity = 0.10 + level * 0.025;
    atmosphere.style.setProperty('--speed-opacity', String(intensity));
    atmosphere.style.setProperty('--horizon-opacity', String(0.34 + level * 0.035));
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
})();
