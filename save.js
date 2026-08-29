(() => {
  'use strict';

  const BASE_KEY = 'dont-stop-save-v2';
  const LEGACY_KEYS = ['dont-stop-save-v1'];
  const defaults = {
    version: 2,
    playerName: 'Player',
    level: 1,
    unlockedLevels: [1],
    selectedLevel: 1,
    xp: 0,
    coins: 0,
    gems: 0,
    bestScore: 0,
    bestTime: 0,
    bestCombo: 0,
    inventory: [],
    equipped: {},
    achievements: [],
    missions: {},
    season: {},
    settings: { music: true, sfx: true, haptics: true, graphics: 'high', language: 'de' },
    progress: {},
    updatedAt: Date.now()
  };

  function activeUser() {
    try {
      const username = (localStorage.getItem('dontStopSessionV1') || '').trim();
      return username || 'guest';
    } catch { return 'guest'; }
  }

  function storageKey(username = activeUser()) {
    const safe = String(username || 'guest').trim().toLowerCase().replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || 'guest';
    return `${BASE_KEY}:${safe}`;
  }

  function safeClone(value) { return JSON.parse(JSON.stringify(value)); }

  function deepMerge(target, source) {
    for (const key of Object.keys(source || {})) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value) && typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) deepMerge(target[key], value);
      else target[key] = value;
    }
    return target;
  }

  function normalize(state) {
    state.unlockedLevels = Array.from(new Set([1, ...(state.unlockedLevels || [])].map(Number))).filter(Number.isFinite).sort((a,b) => a-b);
    state.selectedLevel = Math.max(1, Number(state.selectedLevel) || 1);
    state.coins = Math.max(0, Number(state.coins) || 0);
    state.gems = Math.max(0, Number(state.gems) || 0);
    state.bestScore = Math.max(0, Number(state.bestScore) || 0);
    state.bestTime = Math.max(0, Number(state.bestTime) || 0);
    state.bestCombo = Math.max(0, Number(state.bestCombo) || 0);
    return state;
  }

  function read(username = activeUser()) {
    try {
      const key = storageKey(username);
      let raw = localStorage.getItem(key);
      if (!raw && username === 'guest') raw = localStorage.getItem(BASE_KEY) || localStorage.getItem(LEGACY_KEYS[0]);
      if (!raw) return safeClone(defaults);
      return normalize(deepMerge(safeClone(defaults), JSON.parse(raw)));
    } catch { return safeClone(defaults); }
  }

  function write(data, username = activeUser()) {
    try {
      const safe = normalize(deepMerge(safeClone(defaults), data || {}));
      safe.updatedAt = Date.now();
      localStorage.setItem(storageKey(username), JSON.stringify(safe));
      if (username === 'guest') localStorage.removeItem(BASE_KEY);
      window.dispatchEvent(new CustomEvent('dontstop:saved', { detail: safe }));
      return true;
    } catch { return false; }
  }

  function set(patch, username = activeUser()) { return write(deepMerge(read(username), patch || {}), username); }

  function clear(username = activeUser()) {
    try { localStorage.removeItem(storageKey(username)); return true; } catch { return false; }
  }

  function hasSave(username = activeUser()) {
    try { return Boolean(localStorage.getItem(storageKey(username)) || (username === 'guest' && (localStorage.getItem(BASE_KEY) || localStorage.getItem(LEGACY_KEYS[0])))); } catch { return false; }
  }

  function migrateGuestTo(username) {
    try {
      const target = String(username || '').trim();
      if (!target || target.toLowerCase() === 'guest') return false;
      const targetKey = storageKey(target);
      if (localStorage.getItem(targetKey)) return true;
      const raw = localStorage.getItem(storageKey('guest')) || localStorage.getItem(BASE_KEY) || localStorage.getItem(LEGACY_KEYS[0]);
      if (!raw) return true;
      const state = normalize(deepMerge(safeClone(defaults), JSON.parse(raw)));
      state.playerName = target;
      localStorage.setItem(targetKey, JSON.stringify(state));
      return true;
    } catch { return false; }
  }

  function saveImmediately() { write(read()); }

  window.DontStopSave = { read, write, set, clear, hasSave, saveImmediately, migrateGuestTo };
  window.addEventListener('pagehide', saveImmediately, { capture: true });
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveImmediately(); });
  window.addEventListener('beforeunload', saveImmediately);
})();
