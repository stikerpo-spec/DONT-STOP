(() => {
  'use strict';

  const arena = document.getElementById('arena');
  const player = document.getElementById('player');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const coinsEl = document.getElementById('coins');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const savePill = document.getElementById('savePill');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');

  const LANES = 3;
  const DEFAULT_LANE = 1;
  let state = window.DontStopSave.read();
  let lane = Number.isInteger(state.progress?.lane) ? state.progress.lane : DEFAULT_LANE;
  let score = 0;
  let runCoins = 0;
  let elapsed = 0;
  let running = false;
  let gameOver = false;
  let lastFrame = 0;
  let spawnTimer = 0;
  let coinTimer = 0;
  let checkpointTimer = 0;
  let raf = 0;
  let objects = [];
  let touchStartX = 0;
  let seed = null;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const format = n => Math.floor(n).toLocaleString('de-DE');

  function updateHud() {
    scoreEl.textContent = format(score);
    bestEl.textContent = format(state.bestScore || 0);
    coinsEl.textContent = format((state.coins || 0) + runCoins);
  }

  function setSaveStatus(text) {
    savePill.textContent = text;
  }

  function saveActiveRun() {
    const activeRun = running && !gameOver
      ? { score: Math.floor(score), elapsed, runCoins, lane, seed }
      : null;
    const ok = window.DontStopSave.set({
      progress: { ...(state.progress || {}), lane, activeRun }
    });
    state = window.DontStopSave.read();
    setSaveStatus(ok ? 'GESPEICHERT' : 'SAVE FEHLER');
  }

  function finishRunSave() {
    const finalScore = Math.floor(score);
    const finalTime = elapsed;
    const newBest = finalScore > (state.bestScore || 0);
    const nextBestScore = Math.max(state.bestScore || 0, finalScore);
    const nextBestTime = Math.max(state.bestTime || 0, finalTime);
    const nextBestCombo = Math.max(state.bestCombo || 0, 0);
    const stats = state.statistics || {};
    const ok = window.DontStopSave.set({
      bestScore: nextBestScore,
      bestTime: nextBestTime,
      bestCombo: nextBestCombo,
      coins: (state.coins || 0) + runCoins,
      statistics: {
        ...stats,
        totalTime: (stats.totalTime || 0) + finalTime
      },
      progress: { ...(state.progress || {}), lane, activeRun: null }
    });
    state = window.DontStopSave.read();
    setSaveStatus(ok ? 'GESPEICHERT' : 'SAVE FEHLER');
    return newBest;
  }

  function positionPlayer() {
    player.style.left = `${((lane + 0.5) / LANES) * 100}%`;
  }

  function move(delta) {
    if (!running) return;
    const next = clamp(lane + delta, 0, LANES - 1);
    if (next !== lane) {
      lane = next;
      positionPlayer();
      setSaveStatus('GEÄNDERT');
    }
  }

  function createObject(type, laneIndex) {
    const el = document.createElement('div');
    el.className = type === 'coin' ? 'coin' : 'obstacle';
    el.style.left = `${((laneIndex + 0.5) / LANES) * 100}%`;
    el.style.transform = 'translateX(-50%)';
    el.style.top = '-70px';
    arena.appendChild(el);
    objects.push({ el, type, lane: laneIndex, y: -70, collected: false });
  }

  function clearObjects() {
    for (const obj of objects) obj.el.remove();
    objects = [];
  }

  function currentSpeed() {
    return 260 + Math.min(360, elapsed * 8.5);
  }

  function spawnObstacle() {
    const safeLane = Math.floor(Math.random() * LANES);
    const double = elapsed > 18 && Math.random() < 0.24;
    if (double) {
      const lanes = [0, 1, 2].filter(x => x !== safeLane);
      lanes.forEach(laneIndex => createObject('obstacle', laneIndex));
    } else {
      createObject('obstacle', Math.floor(Math.random() * LANES));
    }
  }

  function spawnCoin() {
    createObject('coin', Math.floor(Math.random() * LANES));
  }

  function collides(obj) {
    if (obj.lane !== lane) return false;
    const pr = player.getBoundingClientRect();
    const or = obj.el.getBoundingClientRect();
    return !(pr.right < or.left || pr.left > or.right || pr.bottom < or.top || pr.top > or.bottom);
  }

  function endRun() {
    if (!running) return;
    running = false;
    gameOver = true;
    cancelAnimationFrame(raf);
    clearObjects();
    const newBest = finishRunSave();
    overlay.classList.remove('hidden');
    overlayText.innerHTML = `${newBest ? '<strong>🏆 NEUER REKORD!</strong><br>' : ''}Score: <strong>${format(score)}</strong><br>Überlebt: <strong>${elapsed.toFixed(1)} s</strong><br>Coins: <strong>+${runCoins}</strong>`;
    startBtn.hidden = false;
    startBtn.textContent = 'NOCHMAL';
    resumeBtn.hidden = true;
    updateHud();
  }

  function startRun(resume = false) {
    cancelAnimationFrame(raf);
    clearObjects();
    gameOver = false;
    running = true;
    overlay.classList.add('hidden');
    lane = resume ? clamp(Number(state.progress?.activeRun?.lane ?? state.progress?.lane ?? DEFAULT_LANE), 0, LANES - 1) : DEFAULT_LANE;
    score = resume ? Number(state.progress?.activeRun?.score || 0) : 0;
    elapsed = resume ? Number(state.progress?.activeRun?.elapsed || 0) : 0;
    runCoins = resume ? Number(state.progress?.activeRun?.runCoins || 0) : 0;
    seed = resume ? state.progress?.activeRun?.seed ?? null : Math.floor(Math.random() * 2_147_483_647);
    checkpointTimer = 0;
    lastFrame = performance.now();
    spawnTimer = 0.35;
    coinTimer = 0.8;
    positionPlayer();
    updateHud();

    if (!resume) {
      const stats = state.statistics || {};
      window.DontStopSave.set({
        statistics: { ...stats, totalRuns: (stats.totalRuns || 0) + 1 },
        progress: {
          ...(state.progress || {}),
          activeRun: { score: 0, elapsed: 0, runCoins: 0, lane, seed }
        }
      });
      state = window.DontStopSave.read();
    }
    setSaveStatus('GESPEICHERT');
    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    elapsed += dt;
    score += dt * (100 + elapsed * 1.8);
    spawnTimer -= dt;
    coinTimer -= dt;
    checkpointTimer -= dt;

    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(0.28, 0.92 - elapsed * 0.014);
    }
    if (coinTimer <= 0) {
      spawnCoin();
      coinTimer = Math.max(0.45, 1.35 - elapsed * 0.008);
    }

    const speed = currentSpeed();
    for (const obj of [...objects]) {
      obj.y += speed * dt;
      obj.el.style.top = `${obj.y}px`;
      if (!obj.collected && collides(obj)) {
        if (obj.type === 'coin') {
          obj.collected = true;
          runCoins += 1;
          obj.el.remove();
          objects = objects.filter(x => x !== obj);
          continue;
        }
        endRun();
        return;
      }
      if (obj.y > arena.clientHeight + 100) {
        obj.el.remove();
        objects = objects.filter(x => x !== obj);
      }
    }

    updateHud();
    if (checkpointTimer <= 0) {
      saveActiveRun();
      checkpointTimer = 1;
    }
    raf = requestAnimationFrame(loop);
  }

  function pauseRun() {
    if (!running) return;
    saveActiveRun();
    running = false;
    cancelAnimationFrame(raf);
    overlay.classList.remove('hidden');
    overlayText.textContent = 'Run pausiert. Dein Fortschritt wurde gespeichert.';
    startBtn.hidden = true;
    resumeBtn.hidden = false;
  }

  function saveOnClose() {
    if (running && !gameOver) saveActiveRun();
    else window.DontStopSave.saveImmediately();
  }

  function detectResume() {
    const active = state.progress?.activeRun;
    if (active && Number(active.elapsed) > 0) {
      resumeBtn.hidden = false;
      overlayText.textContent = `Du hast einen gespeicherten Run: ${Number(active.elapsed).toFixed(1)} Sekunden und ${format(active.score)} Punkte.`;
    }
  }

  startBtn.addEventListener('click', () => startRun(false));
  resumeBtn.addEventListener('click', () => startRun(true));
  leftBtn.addEventListener('click', () => move(-1));
  rightBtn.addEventListener('click', () => move(1));

  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (event.key === 'ArrowLeft' || key === 'a') { event.preventDefault(); move(-1); }
    if (event.key === 'ArrowRight' || key === 'd') { event.preventDefault(); move(1); }
    if (event.key === 'Escape' && running) pauseRun();
  });

  arena.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0]?.clientX || 0; }, { passive: true });
  arena.addEventListener('touchend', e => {
    const endX = e.changedTouches[0]?.clientX || 0;
    const dx = endX - touchStartX;
    if (Math.abs(dx) >= 30) move(dx > 0 ? 1 : -1);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveOnClose();
  });
  window.addEventListener('pagehide', saveOnClose);
  window.addEventListener('beforeunload', saveOnClose);

  state = window.DontStopSave.read();
  positionPlayer();
  updateHud();
  detectResume();
})();
