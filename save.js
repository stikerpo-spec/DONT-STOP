(() => {
  const KEY = 'dont-stop-save-v1';
  const defaults = {
    version: 1,
    playerName: 'Player',
    level: 1,
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
    settings: {
      music: true,
      sfx: true,
      haptics: true,
      graphics: 'high',
      language: 'de'
    },
    progress: {},
    updatedAt: Date.now()
  };

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredCloneSafe(defaults);
      const parsed = JSON.parse(raw);
      return deepMerge(structuredCloneSafe(defaults), parsed);
    } catch {
      return structuredCloneSafe(defaults);
    }
  }

  function write(data) {
    try {
      const safe = deepMerge(structuredCloneSafe(defaults), data || {});
      safe.updatedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(safe));
      window.dispatchEvent(new CustomEvent('dontstop:saved', { detail: safe }));
      return true;
    } catch {
      return false;
    }
  }

  function set(patch) {
    const current = read();
    return write(deepMerge(current, patch || {}));
  }

  function clear() {
    try { localStorage.removeItem(KEY); return true; } catch { return false; }
  }

  function hasSave() {
    try { return !!localStorage.getItem(KEY); } catch { return false; }
  }

  function deepMerge(target, source) {
    for (const key of Object.keys(source || {})) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value) && typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
        deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }
    return target;
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function saveImmediately() {
    const state = read();
    write(state);
  }

  window.DontStopSave = { read, write, set, clear, hasSave, saveImmediately };

  // Speichern bei wichtigen Lifecycle-Ereignissen, auch beim Wechsel in den Hintergrund.
  window.addEventListener('pagehide', saveImmediately, { capture: true });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveImmediately();
  });
  window.addEventListener('beforeunload', saveImmediately);

  // Native Wrapper können diesen Hook ebenfalls verwenden.
  document.addEventListener('pause', saveImmediately);
  document.addEventListener('resume', () => window.DontStopSave.read());
})();
