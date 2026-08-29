(() => {
  'use strict';
  if (!document.documentElement.classList.contains('is-native-app')) return;

  const LEVELS = Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    const costs = [0,15,40,90,180,350,650,1100,1800,3000,5000,8000,12500,20000,32000,50000,80000,125000,200000,325000];
    const names = ['NORMAL','SCHNELL','HART','EXTREM','CHAOS','TURBO','NERVEN','RISKANT','BRUTAL','MASTER','APEX','INSANE','NIGHTMARE','OVERLOAD','MERCILESS','GODLIKE','APOCALYPSE','IMPOSSIBLE','LEGEND','ULTIMATE'];
    return { level, cost: costs[i], name: names[i] };
  });

  function render() {
    const el = document.getElementById('levels');
    if (!el || !window.DontStopSave) return;
    const state = window.DontStopSave.read();
    const unlocked = new Set((state.unlockedLevels || [1]).map(Number));
    const selected = Math.max(1, Math.min(20, Number(state.selectedLevel || 1)));
    const highest = Math.max(1, Number(state.progression?.highestLevel || Math.max(...unlocked)));
    el.innerHTML = LEVELS.map(info => {
      const isUnlocked = unlocked.has(info.level);
      const isNext = info.level === Math.max(...unlocked) + 1;
      const canBuy = Number(state.coins || 0) >= info.cost;
      return `<div class="level ${info.level===selected?'active':''}" data-level-card="${info.level}">
        <h2>Level ${info.level}</h2><b>${info.name}</b>
        <div class="desc">${info.level===1?'Kostenloser Einstieg.':info.level<=5?'Mehr Tempo und erste Doppel-Hindernisse.':info.level<=10?'Hohes Tempo, engere Reaktionsfenster und häufigere Kombinationen.':info.level<=15?'Extrem kurze Reaktionsfenster und sehr dichte Hindernismuster.':'Endgame-Stufe für Hardcore-Grinder.'}</div>
        <div class="price">${info.cost===0?'KOSTENLOS':'🪙 '+info.cost.toLocaleString('de-DE')+' Coins'}</div>
        <button class="btn ${isUnlocked?'primary':''}" data-level="${info.level}" ${isUnlocked|| (isNext&&canBuy)?'':'disabled'}>${isUnlocked?(selected===info.level?'AUSGEWÄHLT':'AUSWÄHLEN'):(isNext?`FREISCHALTEN • ${info.cost.toLocaleString('de-DE')} 🪙`:'🔒 ERST VORHERIGES LEVEL')}</button>
      </div>`;
    }).join('');

    el.querySelectorAll('[data-level]').forEach(btn => btn.addEventListener('click', () => {
      const level = Number(btn.dataset.level);
      const latest = window.DontStopSave.read();
      const list = new Set((latest.unlockedLevels || [1]).map(Number));
      if (list.has(level)) {
        window.DontStopSave.set({ selectedLevel: level });
        render();
        return;
      }
      const prev = Math.max(...list);
      const info = LEVELS[level - 1];
      if (level !== prev + 1 || Number(latest.coins || 0) < info.cost) return;
      list.add(level);
      window.DontStopSave.set({ coins: Number(latest.coins || 0) - info.cost, unlockedLevels: [...list].sort((a,b)=>a-b), selectedLevel: level, progression: { ...(latest.progression || {}), highestLevel: Math.max(Number(latest.progression?.highestLevel || 1), level) } });
      render();
      window.dispatchEvent(new Event('resize'));
    }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true }); else render();
  window.addEventListener('dontstop:saved', render);
})();
