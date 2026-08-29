(() => {
  'use strict';

  const SAVE = () => window.DontStopSave?.read?.() || {};
  const set = patch => window.DontStopSave?.set?.(patch) || false;
  const fmt = n => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('de-DE');

  const WORLDS = [
    { id: 'city', name: 'CITY', level: 1, color: '#6d5cff', desc: 'Die klassische Strecke für den Einstieg.' },
    { id: 'night', name: 'NIGHT CITY', level: 5, color: '#20e3b2', desc: 'Neon, dichterer Verkehr und höhere Geschwindigkeiten.' },
    { id: 'desert', name: 'DESERT', level: 9, color: '#ffd166', desc: 'Heiße Straßen und aggressive Hindernisse.' },
    { id: 'snow', name: 'SNOW', level: 13, color: '#9ed8ff', desc: 'Rutschige Strecke mit wenig Reaktionszeit.' },
    { id: 'cyber', name: 'CYBER', level: 17, color: '#b46cff', desc: 'Futuristische Hochgeschwindigkeitsstrecke.' },
    { id: 'volcano', name: 'VOLCANO', level: 20, color: '#ff6b4a', desc: 'Die letzte Welt. Nur für absolute Profis.' }
  ];

  const UPGRADE_DEFS = {
    multiplier: { name: 'COIN-MULTIPLIKATOR', desc: 'Erhöht deine Coin-Belohnung pro Ausweichen.', base: 250, factor: 2.15, max: 10 },
    magnet: { name: 'COIN-MAGNET', desc: 'Sammelt Coins aus größerer Entfernung.', base: 400, factor: 2.05, max: 8 },
    shield: { name: 'SCHILD', desc: 'Gibt dir einen zusätzlichen Fehler-Puffer pro Run.', base: 750, factor: 2.3, max: 5 },
    slowmo: { name: 'SLOW-MOTION', desc: 'Verbessert kurze Reaktionsfenster bei hohem Tempo.', base: 1000, factor: 2.25, max: 5 },
    jump: { name: 'JUMP BOOST', desc: 'Macht hohe Sprünge leichter.', base: 600, factor: 2.1, max: 8 }
  };

  const MISSION_DEFS = [
    { id: 'dodges100', name: '100 AUSWEICHER', desc: 'Weiche insgesamt 100 Hindernissen aus.', key: 'totalDodges', target: 100, reward: 500 },
    { id: 'dodges500', name: '500 AUSWEICHER', desc: 'Weiche insgesamt 500 Hindernissen aus.', key: 'totalDodges', target: 500, reward: 2500 },
    { id: 'coins5000', name: 'COIN-HUNTER', desc: 'Sammle insgesamt 5.000 Coins.', key: 'coins', target: 5000, reward: 1000 },
    { id: 'time120', name: '2 MINUTEN', desc: 'Erreiche insgesamt 120 Sekunden Spielzeit.', key: 'totalTime', target: 120, reward: 1200 },
    { id: 'score10000', name: 'HIGH SCORE', desc: 'Erreiche einen Score von 10.000.', key: 'bestScore', target: 10000, reward: 2000 },
    { id: 'level10', name: 'MASTER', desc: 'Schalte Level 10 frei.', key: 'highestLevel', target: 10, reward: 3000 },
    { id: 'level20', name: 'ULTIMATE', desc: 'Schalte Level 20 frei.', key: 'highestLevel', target: 20, reward: 15000 }
  ];

  function ensure() {
    const s = SAVE();
    const upgrades = { multiplier: 0, magnet: 0, shield: 0, slowmo: 0, jump: 0, ...(s.upgrades || {}) };
    const progression = {
      world: s.progression?.world || 'city',
      prestige: Math.max(0, Number(s.progression?.prestige || 0)),
      dailyStreak: Math.max(0, Number(s.progression?.dailyStreak || 0)),
      dailyClaimedAt: s.progression?.dailyClaimedAt || '',
      highestLevel: Math.max(1, Number(s.progression?.highestLevel || Math.max(...(s.unlockedLevels || [1]), 1))),
      ...(s.progression || {})
    };
    if (s.upgrades && s.progression && s.profile) return s;
    set({
      upgrades,
      progression,
      profile: { ...(s.profile || {}), playerName: s.playerName || 'Player' },
      missionClaimed: { ...(s.missionClaimed || {}) }
    });
    return SAVE();
  }

  function upgradeCost(id, level) {
    const d = UPGRADE_DEFS[id];
    return Math.round(d.base * Math.pow(d.factor, level));
  }

  function canAfford(cost) { return Number(SAVE().coins || 0) >= cost; }

  function buyUpgrade(id) {
    const s = ensure(), def = UPGRADE_DEFS[id];
    if (!def) return { ok: false, message: 'Upgrade nicht gefunden.' };
    const current = Math.max(0, Number(s.upgrades?.[id] || 0));
    if (current >= def.max) return { ok: false, message: 'MAX LEVEL' };
    const cost = upgradeCost(id, current);
    if (!canAfford(cost)) return { ok: false, message: `Du brauchst ${fmt(cost)} Coins.` };
    const upgrades = { ...(s.upgrades || {}), [id]: current + 1 };
    set({ coins: Number(s.coins || 0) - cost, upgrades });
    return { ok: true, message: `${def.name} auf Level ${current + 1}` };
  }

  function worldUnlocked(world) {
    const s = ensure();
    return Number(s.progression?.highestLevel || 1) >= world.level;
  }

  function selectWorld(id) {
    const world = WORLDS.find(w => w.id === id);
    if (!world || !worldUnlocked(world)) return false;
    return set({ progression: { ...(SAVE().progression || {}), world: id } });
  }

  function refreshHighestLevel() {
    const s = ensure();
    const highest = Math.max(1, ...(s.unlockedLevels || [1]).map(Number));
    if (highest > Number(s.progression?.highestLevel || 1)) set({ progression: { ...(s.progression || {}), highestLevel: highest } });
  }

  function dailyInfo() {
    const s = ensure();
    const now = new Date();
    const key = now.toISOString().slice(0, 10);
    const claimed = s.progression?.dailyClaimedAt === key;
    const streak = Math.max(0, Number(s.progression?.dailyStreak || 0));
    const reward = Math.min(25000, 100 + streak * 250);
    return { key, claimed, streak, reward };
  }

  function claimDaily() {
    const s = ensure();
    const d = dailyInfo();
    if (d.claimed) return { ok: false, message: 'Heute bereits abgeholt.' };
    const reward = d.reward;
    set({ coins: Number(s.coins || 0) + reward, progression: { ...(s.progression || {}), dailyClaimedAt: d.key, dailyStreak: d.streak + 1 } });
    return { ok: true, reward };
  }

  function missionProgress(mission) {
    const s = ensure();
    const st = s.statistics || {};
    let value = 0;
    if (mission.key === 'coins') value = Number(s.coins || 0);
    else if (mission.key === 'highestLevel') value = Number(s.progression?.highestLevel || 1);
    else value = Number(st[mission.key] || s[mission.key] || 0);
    return Math.min(mission.target, value);
  }

  function claimMission(id) {
    const mission = MISSION_DEFS.find(m => m.id === id);
    if (!mission) return { ok: false, message: 'Mission nicht gefunden.' };
    const s = ensure();
    if (s.missionClaimed?.[id]) return { ok: false, message: 'Bereits eingelöst.' };
    if (missionProgress(mission) < mission.target) return { ok: false, message: 'Noch nicht abgeschlossen.' };
    const missionClaimed = { ...(s.missionClaimed || {}), [id]: true };
    set({ coins: Number(s.coins || 0) + mission.reward, missionClaimed });
    return { ok: true, reward: mission.reward };
  }

  function prestige() {
    const s = ensure();
    const highest = Number(s.progression?.highestLevel || 1);
    if (highest < 20) return { ok: false, message: 'Erreiche zuerst Level 20.' };
    const next = Number(s.progression?.prestige || 0) + 1;
    set({
      coins: 0,
      unlockedLevels: [1],
      selectedLevel: 1,
      upgrades: { multiplier: 0, magnet: 0, shield: 0, slowmo: 0, jump: 0 },
      progression: { ...(s.progression || {}), prestige: next, highestLevel: 1, world: 'city' }
    });
    return { ok: true, prestige: next };
  }

  function multiplier() {
    const s = ensure();
    const level = Number(s.upgrades?.multiplier || 0);
    const prestige = Number(s.progression?.prestige || 0);
    return Math.min(10, 1 + level * 0.5 + prestige * 0.1);
  }

  function syncFromGame() {
    refreshHighestLevel();
  }

  function panel() {
    if (location.pathname.endsWith('/game.html')) return;
    const s = ensure();
    const root = document.createElement('section');
    root.id = 'dontStopProgressionPanel';
    root.innerHTML = `<style>
      #dontStopProgressionPanel{margin-top:18px;padding:22px;border:1px solid rgba(109,92,255,.28);border-radius:24px;background:linear-gradient(145deg,rgba(109,92,255,.09),rgba(255,255,255,.025));color:#fff;font-family:Inter,system-ui,sans-serif}
      #dontStopProgressionPanel h2{margin:0 0 6px;font-size:1.5rem}.ds-p-sub{color:#9da7c0;font-size:.88rem;margin-bottom:18px}.ds-p-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.ds-p-card{border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:16px;background:rgba(0,0,0,.12)}.ds-p-card h3{margin:0 0 8px;font-size:1rem}.ds-p-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)}.ds-p-row:last-child{border-bottom:0}.ds-p-muted{color:#9da7c0;font-size:.78rem}.ds-p-btn{border:1px solid rgba(255,255,255,.12);border-radius:11px;padding:8px 10px;background:rgba(255,255,255,.05);color:#fff;font-weight:800;cursor:pointer}.ds-p-btn.primary{background:linear-gradient(135deg,#6d5cff,#a04dff);border-color:transparent}.ds-p-btn:disabled{opacity:.45;cursor:not-allowed}.ds-p-progress{height:6px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin-top:8px}.ds-p-bar{height:100%;background:linear-gradient(90deg,#6d5cff,#20e3b2)}.ds-p-toast{margin-top:12px;min-height:18px;color:#9cf5dd;font-size:.82rem}.ds-p-world{display:flex;justify-content:space-between;gap:8px;align-items:center}.ds-p-tag{font-size:.68rem;font-weight:900;padding:5px 7px;border-radius:999px;background:rgba(255,255,255,.06)}
      @media(max-width:800px){.ds-p-grid{grid-template-columns:1fr}}
    </style>
    <h2>⚡ DEIN PROGRESS</h2><div class="ds-p-sub">Grinden, verbessern, neue Welten freischalten und prestigieren.</div>
    <div class="ds-p-grid">
      <div class="ds-p-card"><h3>👤 Profil</h3><div class="ds-p-row"><span>Spieler</span><b id="dsProfileName"></b></div><div class="ds-p-row"><span>Prestige</span><b id="dsPrestige"></b></div><div class="ds-p-row"><span>Coin-Multiplikator</span><b id="dsMultiplier"></b></div><div class="ds-p-row"><span>Best Score</span><b id="dsBestScore"></b></div></div>
      <div class="ds-p-card"><h3>🎁 Daily Reward</h3><div class="ds-p-row"><span>Streak</span><b id="dsDailyStreak"></b></div><div class="ds-p-row"><span>Belohnung</span><b id="dsDailyReward"></b></div><button class="ds-p-btn primary" id="dsDailyBtn"></button></div>
      <div class="ds-p-card"><h3>🚀 Upgrades</h3><div id="dsUpgrades"></div></div>
      <div class="ds-p-card"><h3>🌎 Welten</h3><div id="dsWorlds"></div></div>
      <div class="ds-p-card" style="grid-column:1/-1"><h3>🎯 Missionen</h3><div id="dsMissions"></div></div>
      <div class="ds-p-card" style="grid-column:1/-1"><h3>👑 Prestige</h3><div class="ds-p-muted">Level 20 erreichen, Fortschritt zurücksetzen und einen dauerhaften Prestige-Bonus erhalten.</div><div class="ds-p-row"><span>Aktuelles Prestige</span><b id="dsPrestige2"></b></div><button class="ds-p-btn" id="dsPrestigeBtn">PRESTIGE</button></div>
    </div><div class="ds-p-toast" id="dsToast"></div>`;

    function render() {
      const state = ensure();
      const daily = dailyInfo();
      refreshHighestLevel();
      document.getElementById('dsProfileName').textContent = state.playerName || 'Player';
      document.getElementById('dsPrestige').textContent = fmt(state.progression?.prestige || 0);
      document.getElementById('dsPrestige2').textContent = fmt(state.progression?.prestige || 0);
      document.getElementById('dsMultiplier').textContent = `x${multiplier().toFixed(1)}`;
      document.getElementById('dsBestScore').textContent = fmt(state.bestScore || 0);
      document.getElementById('dsDailyStreak').textContent = fmt(daily.streak);
      document.getElementById('dsDailyReward').textContent = `${fmt(daily.reward)} 🪙`;
      const db = document.getElementById('dsDailyBtn'); db.textContent = daily.claimed ? 'HEUTE ERLEDIGT ✓' : 'REWARD ABHOLEN'; db.disabled = daily.claimed;

      const up = document.getElementById('dsUpgrades'); up.innerHTML = Object.entries(UPGRADE_DEFS).map(([id,d]) => { const lv=Number(state.upgrades?.[id]||0); const cost=upgradeCost(id,lv); return `<div class="ds-p-row"><div><b>${d.name}</b><div class="ds-p-muted">Level ${lv}/${d.max} · ${d.desc}</div><div class="ds-p-progress"><div class="ds-p-bar" style="width:${lv/d.max*100}%"></div></div></div><button class="ds-p-btn" data-up="${id}" ${lv>=d.max?'disabled':''}>${lv>=d.max?'MAX':fmt(cost)+' 🪙'}</button></div>`; }).join('');
      up.querySelectorAll('[data-up]').forEach(btn => btn.onclick = () => { const r=buyUpgrade(btn.dataset.up); toast(r.message); render(); });

      const ww = document.getElementById('dsWorlds'); ww.innerHTML = WORLDS.map(w => { const unlocked=worldUnlocked(w); const selected=(state.progression?.world||'city')===w.id; return `<div class="ds-p-row"><div class="ds-p-world"><div><b>${w.name}</b><div class="ds-p-muted">${w.desc}</div></div><span class="ds-p-tag">LEVEL ${w.level}</span></div><button class="ds-p-btn ${selected?'primary':''}" data-world="${w.id}" ${unlocked?'':'disabled'}>${selected?'AUSGEWÄHLT':unlocked?'AUSWÄHLEN':'🔒'}</button></div>`; }).join('');
      ww.querySelectorAll('[data-world]').forEach(btn => btn.onclick = () => { selectWorld(btn.dataset.world); toast('Welt ausgewählt.'); render(); });

      const mm = document.getElementById('dsMissions'); mm.innerHTML = MISSION_DEFS.map(m => { const p=missionProgress(m), claimed=Boolean(state.missionClaimed?.[m.id]), done=p>=m.target; return `<div class="ds-p-row"><div style="flex:1"><b>${m.name}</b><div class="ds-p-muted">${m.desc} · ${fmt(p)} / ${fmt(m.target)}</div><div class="ds-p-progress"><div class="ds-p-bar" style="width:${Math.min(100,p/m.target*100)}%"></div></div></div><button class="ds-p-btn ${done&&!claimed?'primary':''}" data-mission="${m.id}" ${!done||claimed?'disabled':''}>${claimed?'ERLEDIGT':`+${fmt(m.reward)} 🪙`}</button></div>`; }).join('');
      mm.querySelectorAll('[data-mission]').forEach(btn => btn.onclick = () => { const r=claimMission(btn.dataset.mission); toast(r.ok?`+${fmt(r.reward)} Coins`:r.message); render(); });

      const pb=document.getElementById('dsPrestigeBtn'); pb.disabled=(Number(state.progression?.highestLevel||1)<20); pb.textContent=Number(state.progression?.highestLevel||1)>=20?'PRESTIGE STARTEN':'LEVEL 20 BENÖTIGT';
    }
    function toast(text){document.getElementById('dsToast').textContent=text;}
    root.querySelector('#dsDailyBtn').onclick=()=>{const r=claimDaily();toast(r.ok?`+${fmt(r.reward)} Coins`:r.message);render();};
    root.querySelector('#dsPrestigeBtn').onclick=()=>{const r=prestige();toast(r.ok?`PRESTIGE ${r.prestige} erreicht!`:`${r.message}`);render();};
    root._render=render;
    document.querySelector('.shell .card')?.appendChild(root);
    render();
  }

  window.DontStopProgression = { ensure, buyUpgrade, selectWorld, claimDaily, claimMission, prestige, multiplier, refreshHighestLevel, syncFromGame, WORLDS, UPGRADE_DEFS, MISSION_DEFS };
  ensure();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', panel, { once: true }); else panel();
  window.addEventListener('dontstop:saved', () => { refreshHighestLevel(); document.getElementById('dontStopProgressionPanel')?._render?.(); });
})();
