(() => {
  'use strict';

  const arena = document.getElementById('arena');
  const player = document.getElementById('player');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const coinsEl = document.getElementById('coins');
  const levelEl = document.getElementById('level');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const savePill = document.getElementById('savePill');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');

  const LANES = 3;
  const DEFAULT_LANE = 1;
  const LEVELS = {
    1: { name: 'NORMAL', speed: 240, spawn: 1.05, ramp: 3.0, doubleAfter: 999, doubleChance: 0 },
    2: { name: 'SCHNELL', speed: 285, spawn: 0.90, ramp: 4.5, doubleAfter: 14, doubleChance: 0.10 },
    3: { name: 'HART', speed: 325, spawn: 0.78, ramp: 5.5, doubleAfter: 10, doubleChance: 0.18 },
    4: { name: 'EXTREM', speed: 365, spawn: 0.66, ramp: 6.5, doubleAfter: 8, doubleChance: 0.24 },
    5: { name: 'CHAOS', speed: 410, spawn: 0.56, ramp: 7.0, doubleAfter: 6, doubleChance: 0.30 }
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const format = n => Math.floor(n).toLocaleString('de-DE');

  let state = window.DontStopSave.read();
  let lane = Number.isInteger(state.progress?.lane) ? state.progress.lane : DEFAULT_LANE;
  let selectedLevel = clamp(Number(state.selectedLevel || 1), 1, Object.keys(LEVELS).length);
  let score = 0;
  let runCoins = 0;
  let dodged = 0;
  let elapsed = 0;
  let running = false;
  let gameOver = false;
  let lastFrame = 0;
  let spawnTimer = 0;
  let checkpointTimer = 0;
  let raf = 0;
  let objects = [];
  let touchStartX = 0;
  let seed = null;

  const levelConfig = () => LEVELS[selectedLevel] || LEVELS[1];
  function updateHud() {
    scoreEl.textContent = format(score);
    bestEl.textContent = format(state.bestScore || 0);
    coinsEl.textContent = format((state.coins || 0) + runCoins);
    if (levelEl) levelEl.textContent = `${selectedLevel} • ${levelConfig().name}`;
  }
  function setSaveStatus(text) { savePill.textContent = text; }

  function saveActiveRun() {
    const activeRun = running && !gameOver ? { score: Math.floor(score), elapsed, runCoins, dodged, lane, seed, selectedLevel } : null;
    const ok = window.DontStopSave.set({ selectedLevel, progress: { ...(state.progress || {}), lane, activeRun } });
    state = window.DontStopSave.read();
    setSaveStatus(ok ? 'GESPEICHERT' : 'SAVE FEHLER');
  }

  function finishRunSave() {
    const finalScore = Math.floor(score);
    const finalTime = elapsed;
    const newBest = finalScore > (state.bestScore || 0);
    const stats = state.statistics || {};
    const ok = window.DontStopSave.set({
      bestScore: Math.max(state.bestScore || 0, finalScore),
      bestTime: Math.max(state.bestTime || 0, finalTime),
      bestCombo: Math.max(state.bestCombo || 0, dodged),
      coins: (state.coins || 0) + runCoins,
      selectedLevel,
      statistics: { ...stats, totalTime: (stats.totalTime || 0) + finalTime, totalDodges: (stats.totalDodges || 0) + dodged },
      progress: { ...(state.progress || {}), lane, activeRun: null }
    });
    state = window.DontStopSave.read();
    setSaveStatus(ok ? 'GESPEICHERT' : 'SAVE FEHLER');
    return newBest;
  }

  function positionPlayer() { player.style.left = `${((lane + 0.5) / LANES) * 100}%`; }
  function move(delta) {
    if (!running) return;
    const next = clamp(lane + delta, 0, LANES - 1);
    if (next !== lane) {
      lane = next;
      positionPlayer();
      window.DontStopSave.set({ progress: { ...(state.progress || {}), lane } });
      setSaveStatus('GEÄNDERT');
    }
  }

  function createObstacle(laneIndex) {
    const el = document.createElement('div');
    el.className = 'obstacle';
    el.style.left = `${((laneIndex + 0.5) / LANES) * 100}%`;
    el.style.transform = 'translateX(-50%)';
    el.style.top = '-70px';
    arena.appendChild(el);
    objects.push({ el, type: 'obstacle', lane: laneIndex, y: -70, scored: false, id: `${Date.now()}-${Math.random()}` });
  }
  function clearObjects() { for (const obj of objects) obj.el.remove(); objects = []; }
  function currentSpeed() { const cfg = levelConfig(); return cfg.speed + Math.min(330, elapsed * cfg.ramp); }
  function spawnObstacle() {
    const cfg = levelConfig();
    // Es gibt bei jedem Spawn immer mindestens eine sichtbar freie Spur.
    const safeLane = Math.floor(Math.random() * LANES);
    const canDouble = elapsed >= cfg.doubleAfter && cfg.doubleChance > 0 && Math.random() < cfg.doubleChance;
    if (canDouble) {
      [0, 1, 2].filter(x => x !== safeLane).forEach(createObstacle);
    } else {
      // Bugfix: Die zuvor berechnete sichere Spur wurde hier ignoriert.
      // Das Hindernis wird jetzt genau in der zufällig gewählten Spur gespawnt,
      // während die beiden anderen Spuren frei bleiben.
      createObstacle((safeLane + 1) % LANES);
    }
  }
  function obstacleHit(obj) {
    if (obj.lane !== lane) return false;
    const pr = player.getBoundingClientRect();
    const or = obj.el.getBoundingClientRect();
    const overlapX = Math.min(pr.right, or.right) - Math.max(pr.left, or.left);
    const overlapY = Math.min(pr.bottom, or.bottom) - Math.max(pr.top, or.top);
    return overlapX > 8 && overlapY > 8;
  }

  function endRun() {
    if (!running) return;
    running = false;
    gameOver = true;
    cancelAnimationFrame(raf);
    clearObjects();
    const newBest = finishRunSave();
    overlay.classList.remove('hidden');
    overlayText.innerHTML = `${newBest ? '<strong>🏆 NEUER REKORD!</strong><br>' : ''}Level ${selectedLevel} • ${levelConfig().name}<br>Score: <strong>${format(score)}</strong><br>Ausgewichen: <strong>${format(dodged)}</strong><br>Coins: <strong>+${runCoins}</strong>`;
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
    const active = state.progress?.activeRun;
    if (resume && active) {
      selectedLevel = clamp(Number(active.selectedLevel || state.selectedLevel || 1), 1, 5);
      lane = clamp(Number(active.lane ?? state.progress?.lane ?? DEFAULT_LANE), 0, LANES - 1);
      score = Number(active.score || 0);
      elapsed = Number(active.elapsed || 0);
      runCoins = Number(active.runCoins || 0);
      dodged = Number(active.dodged || 0);
      seed = active.seed ?? null;
    } else {
      selectedLevel = clamp(Number(state.selectedLevel || 1), 1, 5);
      lane = DEFAULT_LANE;
      score = 0;
      elapsed = 0;
      runCoins = 0;
      dodged = 0;
      seed = Math.floor(Math.random() * 2_147_483_647);
    }
    checkpointTimer = 0;
    lastFrame = performance.now();
    spawnTimer = resume ? 0.5 : 0.75;
    positionPlayer();
    updateHud();
    if (!resume) {
      const stats = state.statistics || {};
      window.DontStopSave.set({
        selectedLevel,
        statistics: { ...stats, totalRuns: (stats.totalRuns || 0) + 1 },
        progress: { ...(state.progress || {}), activeRun: { score: 0, elapsed: 0, runCoins: 0, dodged: 0, lane, seed, selectedLevel } }
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
    score += dt * (90 + selectedLevel * 18 + elapsed * (1.25 + selectedLevel * 0.12));
    spawnTimer -= dt;
    checkpointTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const cfg = levelConfig();
      spawnTimer = Math.max(0.30, cfg.spawn - elapsed * 0.007);
    }

    const speed = currentSpeed();
    for (const obj of [...objects]) {
      obj.y += speed * dt;
      obj.el.style.top = `${obj.y}px`;
      if (obstacleHit(obj)) { endRun(); return; }
      const playerZoneY = arena.clientHeight * 0.76;
      if (!obj.scored && obj.y > playerZoneY + 34) {
        obj.scored = true;
        dodged += 1;
        runCoins += 1;
      }
      if (obj.y > arena.clientHeight + 100) {
        obj.el.remove();
        objects = objects.filter(x => x !== obj);
      }
    }

    updateHud();
    if (checkpointTimer <= 0) { saveActiveRun(); checkpointTimer = 0.75; }
    raf = requestAnimationFrame(loop);
  }

  function pauseRun() {
    if (!running) return;
    saveActiveRun();
    running = false;
    cancelAnimationFrame(raf);
    overlay.classList.remove('hidden');
    overlayText.textContent = `Level ${selectedLevel} pausiert. ${format(runCoins)} Coins im aktuellen Run. Dein Fortschritt wurde gespeichert.`;
    startBtn.hidden = true;
    resumeBtn.hidden = false;
  }
  function saveOnClose() { if (running && !gameOver) saveActiveRun(); else window.DontStopSave.saveImmediately(); }
  function detectResume() {
    const active = state.progress?.activeRun;
    if (active && Number(active.elapsed) > 0) {
      resumeBtn.hidden = false;
      overlayText.textContent = `Gespeicherter Run: Level ${active.selectedLevel || 1} • ${Number(active.elapsed).toFixed(1)} s • ${format(active.runCoins || 0)} Coins.`;
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveOnClose(); });
  window.addEventListener('pagehide', saveOnClose);
  window.addEventListener('beforeunload', saveOnClose);

  state = window.DontStopSave.read();
  positionPlayer();
  updateHud();
  detectResume();
})();
