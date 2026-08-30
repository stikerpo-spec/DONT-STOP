(() => {
  'use strict';
  const api = window.DontStopDiscord;
  const isElectron = Boolean(api?.update);
  let startedAt = 0;
  let timer = 0;
  let last = '';

  function enabled() { return isElectron; }
  function payload(data = {}) {
    const level = Number(data.level || 1);
    const world = String(data.world || 'CITY').toUpperCase();
    const score = Math.max(0, Math.floor(Number(data.score) || 0)).toLocaleString('de-DE');
    const time = Math.max(0, Math.floor(Number(data.elapsed) || 0));
    const min = Math.floor(time / 60);
    const sec = String(time % 60).padStart(2, '0');
    return {
      details: String(data.details || "DON'T STOP • Level " + level),
      state: String(data.state || `${world} • Score ${score} • ${min}:${sec}`),
      startedAt: startedAt || Math.floor(Date.now() / 1000)
    };
  }
  async function update(data = {}, force = false) {
    if (!enabled()) return false;
    const p = payload(data);
    const key = JSON.stringify(p);
    if (!force && key === last) return true;
    last = key;
    try { const r = await api.update(p); return Boolean(r?.ok); } catch { return false; }
  }
  function start(data = {}) { startedAt = Math.floor(Date.now() / 1000); last = ''; update(data, true); clearTimeout(timer); timer = setTimeout(() => update(data, true), 15000); }
  function stop() { clearTimeout(timer); timer = 0; if (enabled()) api.clear().catch(() => {}); startedAt = 0; last = ''; }
  function tick(data = {}) { clearTimeout(timer); timer = setTimeout(() => update(data, true), 10000); }
  window.DontStopDiscordPresence = { update, start, stop, tick };
})();
