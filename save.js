(() => {
  const KEY = 'dont-stop-save-v2';
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

  function read() {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem('dont-stop-save-v1');
      if (!raw) return structuredCloneSafe(defaults);
      const parsed = JSON.parse(raw);
      const state = deepMerge(structuredCloneSafe(defaults), parsed);
      state.unlockedLevels = Array.from(new Set([1, ...(state.unlockedLevels || [])])).sort((a,b) => a-b);
      state.selectedLevel = Number(state.selectedLevel || 1);
      return state;
    } catch { return structuredCloneSafe(defaults); }
  }

  function write(data) {
    try {
      const safe = deepMerge(structuredCloneSafe(defaults), data || {});
      safe.updatedAt = Date.now();
      safe.unlockedLevels = Array.from(new Set([1, ...(safe.unlockedLevels || [])])).sort((a,b) => a-b);
      localStorage.setItem(KEY, JSON.stringify(safe));
      window.dispatchEvent(new CustomEvent('dontstop:saved', { detail: safe }));
      return true;
    } catch { return false; }
  }

  function set(patch) { return write(deepMerge(read(), patch || {})); }
  function clear() { try { localStorage.removeItem(KEY); localStorage.removeItem('dont-stop-save-v1'); return true; } catch { return false; } }
  function hasSave() { try { return !!(localStorage.getItem(KEY) || localStorage.getItem('dont-stop-save-v1')); } catch { return false; } }

  function deepMerge(target, source) {
    for (const key of Object.keys(source || {})) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value) && typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) deepMerge(target[key], value);
      else target[key] = value;
    }
    return target;
  }

  function structuredCloneSafe(value) { return JSON.parse(JSON.stringify(value)); }
  function saveImmediately() { write(read()); }

  window.DontStopSave = { read, write, set, clear, hasSave, saveImmediately };
  window.addEventListener('pagehide', saveImmediately, { capture: true });
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveImmediately(); });
  window.addEventListener('beforeunload', saveImmediately);
  document.addEventListener('pause', saveImmediately);
  document.addEventListener('resume', () => window.DontStopSave.read());
})();