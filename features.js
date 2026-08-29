(() => {
  'use strict';
  if (!window.DontStopSave) return;

  const SAVE = () => window.DontStopSave.read();
  const SET = patch => window.DontStopSave.set(patch);
  const fmt = n => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('de-DE');

  const WORLDS = [
    { id:'city', name:'CITY', unlock:1, image:'./assets/world-city.svg', desc:'Die klassische Startwelt.' },
    { id:'night', name:'NIGHT CITY', unlock:5, image:'./assets/world-night.svg', desc:'Neon, Nacht und dichter Verkehr.' },
    { id:'desert', name:'DESERT', unlock:9, image:'./assets/world-desert.svg', desc:'Heiße Straßen und harte Muster.' },
    { id:'snow', name:'SNOW', unlock:13, image:'./assets/world-snow.svg', desc:'Kälte, Nebel und schnelle Spuren.' },
    { id:'cyber', name:'CYBER', unlock:17, image:'./assets/world-cyber.svg', desc:'Futuristische Hochgeschwindigkeit.' },
    { id:'volcano', name:'VOLCANO', unlock:20, image:'./assets/world-volcano.svg', desc:'Endgame mit maximalem Risiko.' }
  ];

  const CHARACTERS = [
    {id:'starter',name:'STARTER',cost:0,desc:'Der klassische Runner.',emoji:'🏃'},
    {id:'speedster',name:'SPEEDSTER',cost:15000,desc:'Schneller Start.',emoji:'⚡'},
    {id:'collector',name:'COLLECTOR',cost:50000,desc:'Für Grinder.',emoji:'🪙'},
    {id:'ninja',name:'NINJA',cost:150000,desc:'Perfekt für Sprünge.',emoji:'🥷'},
    {id:'robot',name:'ROBOT',cost:500000,desc:'Futuristischer Runner.',emoji:'🤖'},
    {id:'void',name:'VOID RUNNER',cost:2500000,desc:'Endgame-Legende.',emoji:'🌀'}
  ];

  const TRAILS = [
    {id:'fire',name:'FIRE',cost:5000,emoji:'🔥'}, {id:'lightning',name:'LIGHTNING',cost:15000,emoji:'⚡'},
    {id:'plasma',name:'PLASMA',cost:50000,emoji:'💜'}, {id:'rainbow',name:'RAINBOW',cost:150000,emoji:'🌈'},
    {id:'galaxy',name:'GALAXY',cost:500000,emoji:'🌌'}, {id:'void',name:'VOID',cost:2500000,emoji:'🌀'}
  ];

  const ACHIEVEMENTS = [
    ['first','FIRST STEPS','Starte deinen ersten Run.'], ['rich','RICH','Besitze 100.000 Coins.'],
    ['millionaire','MILLIONAIRE','Besitze 1.000.000 Coins.'], ['dodge100','UNTOUCHABLE','Weiche 100 Hindernissen aus.'],
    ['score10k','SPEED DEMON','Erreiche 10.000 Score.'], ['prestige10','PRESTIGE MASTER','Erreiche Prestige 10.'],
    ['level20','THE IMPOSSIBLE','Schalte Level 20 frei.'], ['daily7','LOYAL','Erreiche 7 Daily-Rewards in Folge.']
  ];

  const SEASON = { name:'SEASON 1 • NEON CITY', end:'Dauersaison', rewards:['500 Coins','1.000 Coins','FIRE Trail','10 Gems','NEON Badge'] };

  function ensure() {
    const s = SAVE();
    const next = {
      ...s,
      gems: Number(s.gems || 0),
      upgrades: { multiplier:0, magnet:0, shield:0, slowmo:0, jump:0, ...(s.upgrades || {}) },
      progression: { world:'city', prestige:0, dailyStreak:0, dailyClaimedAt:'', highestLevel:Math.max(1,...(s.unlockedLevels||[1]).map(Number)), character:'starter', trail:'none', ...(s.progression||{}) },
      ownedCharacters: ['starter',...(s.ownedCharacters||[])],
      ownedTrails: ['none',...(s.ownedTrails||[])],
      season: { xp:0,claimed:[],...(s.season||{}) },
      achievements: [...new Set(s.achievements||[])],
      shop: {date:'',items:[],...(s.shop||{})},
      hardcoreBest: Number(s.hardcoreBest||0),
      dailyChallengeBest: Number(s.dailyChallengeBest||0),
      totalRuns: Number(s.totalRuns || s.statistics?.totalRuns || 0),
      closeCalls: Number(s.closeCalls || 0)
    };
    if (JSON.stringify(next) !== JSON.stringify(s)) SET(next);
    return SAVE();
  }

  function toast(message) {
    let el = document.getElementById('dsFeatureToast');
    if (!el) { el = document.createElement('div'); el.id='dsFeatureToast'; document.body.appendChild(el); }
    el.textContent=message; el.classList.add('show'); clearTimeout(window.__dsToast); window.__dsToast=setTimeout(()=>el.classList.remove('show'),2600);
  }

  function dailyReward(s) {
    const today = new Date().toISOString().slice(0,10);
    const claimed = s.progression?.dailyClaimedAt === today;
    const streak = Number(s.progression?.dailyStreak||0);
    return { today, claimed, streak, reward:Math.min(25000,100+streak*250) };
  }

  function claimDaily() {
    const s=ensure(), d=dailyReward(s); if(d.claimed){toast('Daily Reward heute bereits abgeholt.');return;}
    SET({coins:Number(s.coins||0)+d.reward, progression:{...(s.progression||{}),dailyClaimedAt:d.today,dailyStreak:d.streak+1}}); toast(`🎁 +${fmt(d.reward)} Coins`); render();
  }

  function buy(type,id,cost) {
    const s=ensure(); if(Number(s.coins||0)<cost){toast(`Du brauchst ${fmt(cost)} Coins.`);return false;}
    const patch={coins:Number(s.coins||0)-cost};
    if(type==='character') patch.ownedCharacters=[...new Set([...(s.ownedCharacters||[]),id])];
    if(type==='trail') patch.ownedTrails=[...new Set([...(s.ownedTrails||[]),id])];
    SET(patch); toast(`Freigeschaltet: ${id.toUpperCase()}`); render(); return true;
  }

  function equip(type,id) {
    const s=ensure(); SET({progression:{...(s.progression||{}),[type]:id}}); toast(`${id.toUpperCase()} ausgerüstet`); render();
  }

  function upgradeCost(id, level) {
    const base={multiplier:250,magnet:400,shield:750,slowmo:1000,jump:600}[id]||250;
    const factor={multiplier:2.15,magnet:2.05,shield:2.3,slowmo:2.25,jump:2.1}[id]||2.1;
    return Math.round(base*Math.pow(factor,level));
  }

  function buyUpgrade(id) {
    const s=ensure(), lv=Number(s.upgrades?.[id]||0), max={multiplier:10,magnet:8,shield:5,slowmo:5,jump:8}[id]||5;
    if(lv>=max){toast('Upgrade ist MAX.');return;}
    const cost=upgradeCost(id,lv); if(buy('upgrade',id,cost)) SET({upgrades:{...(SAVE().upgrades||{}),[id]:lv+1}}),render();
  }

  function missionList(s) {
    const stats=s.statistics||{};
    const val={dodges100:Number(stats.totalDodges||0),dodges500:Number(stats.totalDodges||0),coins5000:Number(s.coins||0),time120:Number(stats.totalTime||0),score10000:Number(s.bestScore||0),level10:Number(s.progression?.highestLevel||1),level20:Number(s.progression?.highestLevel||1)};
    return [
      ['dodges100','100 AUSWEICHER',100,val.dodges100,500],['dodges500','500 AUSWEICHER',500,val.dodges500,2500],['coins5000','COIN-HUNTER',5000,val.coins5000,1000],
      ['time120','2 MINUTEN',120, val.time120,1200],['score10000','HIGH SCORE',10000,val.score10000,2000],['level10','MASTER',10,val.level10,3000],['level20','ULTIMATE',20,val.level20,15000]
    ];
  }

  function claimMission(id,target,reward,value) {
    const s=ensure(); const claimed=new Set(s.missionClaimed?Object.keys(s.missionClaimed).filter(k=>s.missionClaimed[k]):[]);
    if(claimed.has(id)){toast('Mission bereits eingelöst.');return;}
    if(value<target){toast('Mission noch nicht abgeschlossen.');return;}
    SET({coins:Number(s.coins||0)+reward,missionClaimed:{...(s.missionClaimed||{}),[id]:true}}); toast(`🎯 Mission: +${fmt(reward)} Coins`);render();
  }

  function openChest(kind) {
    const s=ensure(); const costs={wood:1000,gold:10000,diamond:100000,mythic:1000000}; const cost=costs[kind];
    if(Number(s.coins||0)<cost){toast(`Chest kostet ${fmt(cost)} Coins.`);return;}
    const rolls={wood:[100,250,500,750],gold:[1000,2500,5000,7500],diamond:[10000,25000,50000,75000],mythic:[100000,250000,500000,1000000]};
    const reward=rolls[kind][Math.floor(Math.random()*rolls[kind].length)]; SET({coins:Number(s.coins||0)-cost+reward}); toast(`🎁 ${kind.toUpperCase()} CHEST: +${fmt(reward)} Coins`);render();
  }

  function prestige() {
    const s=ensure(), highest=Number(s.progression?.highestLevel||1); if(highest<20){toast('Erreiche zuerst Level 20.');return;}
    const next=Number(s.progression?.prestige||0)+1; const oldGems=Number(s.gems||0)+Math.min(100,next*2);
    SET({coins:0,gems:oldGems,unlockedLevels:[1],selectedLevel:1,upgrades:{multiplier:0,magnet:0,shield:0,slowmo:0,jump:0},progression:{...(s.progression||{}),prestige:next,highestLevel:1,world:'city',character:'starter',trail:'none'}}); toast(`👑 PRESTIGE ${next}! +${Math.min(100,next*2)} Gems`);render();
  }

  function challenge() {
    const s=ensure(), cfg=[7,11,15,19,23][new Date().getDate()%5];
    toast(`🎮 DAILY CHALLENGE: Level ${cfg} • 1 Versuch • Best ${fmt(s.dailyChallengeBest||0)}`);
  }

  function hardcore(){const s=ensure();toast(`💀 HARDCORE MODE • Best Score ${fmt(s.hardcoreBest||0)} • Keine Upgrades`);}

  function shopItems() {
    const day=new Date().toISOString().slice(0,10); const s=ensure(); if(s.shop?.date===day&&Array.isArray(s.shop.items))return s.shop.items;
    const pool=[...TRAILS.filter(x=>x.id!=='void').map(x=>x.id),...CHARACTERS.filter(x=>x.id!=='starter').map(x=>x.id),'goldchest','gempack'];
    const items=[0,1,2].map(i=>pool[(new Date().getDate()+i*3)%pool.length]); SET({shop:{date:day,items}});return items;
  }

  function style() {
    if(document.getElementById('dsFeatureStyle')) return;
    const st=document.createElement('style');st.id='dsFeatureStyle';st.textContent=`
#dsFeatureToast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;z-index:999999;background:rgba(10,13,25,.96);border:1px solid rgba(255,255,255,.13);padding:12px 16px;border-radius:14px;color:#fff;font:800 13px Inter,system-ui,sans-serif;box-shadow:0 18px 60px rgba(0,0,0,.4);transition:.25s}.show{opacity:1!important;transform:translate(-50%,0)!important}
.ds-feature-shell{margin-top:18px;padding:22px;border:1px solid rgba(109,92,255,.28);border-radius:24px;background:linear-gradient(145deg,rgba(109,92,255,.09),rgba(255,255,255,.025));font-family:Inter,system-ui,sans-serif;color:#fff}.ds-feature-shell h2{margin:0 0 6px}.ds-feature-sub{color:#9da7c0;font-size:.88rem;margin-bottom:16px}.ds-feature-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.ds-feature-card{border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:15px;background:rgba(0,0,0,.12)}.ds-feature-card h3{margin:0 0 10px}.ds-feature-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)}.ds-feature-row:last-child{border-bottom:0}.ds-feature-muted{color:#9da7c0;font-size:.78rem}.ds-feature-btn{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.05);color:#fff;font-weight:800;cursor:pointer}.ds-feature-btn.primary{background:linear-gradient(135deg,#6d5cff,#a04dff);border-color:transparent}.ds-feature-btn:disabled{opacity:.45;cursor:not-allowed}.ds-worlds{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ds-world{overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:#080b16}.ds-world img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.ds-world-body{padding:10px}.ds-progress{height:6px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin:7px 0}.ds-progress>span{display:block;height:100%;background:linear-gradient(90deg,#6d5cff,#20e3b2)}.ds-chest-grid,.ds-item-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ds-mini{padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:13px;text-align:center;background:rgba(255,255,255,.025)}.ds-mini .emoji{font-size:26px;display:block;margin-bottom:5px}.ds-season{border:1px solid rgba(32,227,178,.2);background:linear-gradient(135deg,rgba(32,227,178,.06),rgba(109,92,255,.07))}.ds-kicker{font-size:.68rem;letter-spacing:.12em;font-weight:900;color:#9df3da}.ds-wide{grid-column:1/-1}
@media(max-width:800px){.ds-feature-grid,.ds-worlds{grid-template-columns:1fr}.ds-chest-grid{grid-template-columns:repeat(2,1fr)}.ds-item-grid{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(st);
  }

  function render() {
    if(location.pathname.endsWith('/game.html')) return gameEnhance();
    style(); let root=document.getElementById('dsFeatures'); if(!root){root=document.createElement('section');root.id='dsFeatures';root.className='ds-feature-shell';const anchor=document.getElementById('dontStopProgressionPanel')||document.getElementById('levels')?.parentElement||document.querySelector('.app-only');if(anchor) anchor.appendChild(root); else document.body.appendChild(root);}
    const s=ensure(), d=dailyReward(s), unlocked=new Set((s.unlockedLevels||[1]).map(Number)), highest=Number(s.progression?.highestLevel||Math.max(...unlocked));
    root.innerHTML=`<h2>🔥 DONT STOP • ULTIMATE PROGRESSION</h2><div class="ds-feature-sub">Grinden · freischalten · sammeln · prestigen · Endgame knacken</div>
      <div class="ds-feature-grid">
      <div class="ds-feature-card"><h3>👤 Profil</h3><div class="ds-feature-row"><span>Spieler</span><b>${s.playerName||'Player'}</b></div><div class="ds-feature-row"><span>Coins</span><b>🪙 ${fmt(s.coins)}</b></div><div class="ds-feature-row"><span>Gems</span><b>💎 ${fmt(s.gems)}</b></div><div class="ds-feature-row"><span>Prestige</span><b>${fmt(s.progression?.prestige)}</b></div><div class="ds-feature-row"><span>Multiplikator</span><b>x${(1+(Number(s.upgrades?.multiplier||0)*.5)+(Number(s.progression?.prestige||0)*.1)).toFixed(1)}</b></div></div>
      <div class="ds-feature-card"><h3>🎁 Daily Reward</h3><div class="ds-feature-row"><span>Streak</span><b>${d.streak} Tage</b></div><div class="ds-feature-row"><span>Heute</span><b>${fmt(d.reward)} 🪙</b></div><button id="dsDaily" class="ds-feature-btn primary" ${d.claimed?'disabled':''}>${d.claimed?'HEUTE ERLEDIGT ✓':'REWARD ABHOLEN'}</button></div>
      <div class="ds-feature-card ds-wide"><h3>🗺️ WELTEN</h3><div class="ds-worlds">${WORLDS.map(w=>{const ok=highest>=w.unlock;const active=(s.progression?.world||'city')===w.id;return `<div class="ds-world"><img src="${w.image}" alt="${w.name}"><div class="ds-world-body"><b>${w.name}</b><div class="ds-feature-muted">Ab Level ${w.unlock} · ${w.desc}</div><button class="ds-feature-btn ${active?'primary':''}" data-world="${w.id}" ${ok?'':'disabled'}>${ok?(active?'AKTIV':'AUSWÄHLEN'):'🔒 GESPERRT'}</button></div></div>`}).join('')}</div></div>
      <div class="ds-feature-card"><h3>🚀 UPGRADES</h3><div>${[['multiplier','Coin-Multiplikator',10],['magnet','Coin-Magnet',8],['shield','Schild',5],['slowmo','Slow-Motion',5],['jump','Jump Boost',8]].map(([id,name,max])=>{const lv=Number(s.upgrades?.[id]||0),cost=upgradeCost(id,lv);return `<div class="ds-feature-row"><div><b>${name}</b><div class="ds-feature-muted">Lv ${lv}/${max} · ${lv<max?fmt(cost)+' 🪙':'MAX'}</div></div><button class="ds-feature-btn" data-upgrade="${id}" ${lv>=max?'disabled':''}>${lv>=max?'MAX':'KAUFEN'}</button></div>`}).join('')}</div></div>
      <div class="ds-feature-card"><h3>🎁 LOOT CHESTS</h3><div class="ds-chest-grid">${[['wood','🪵','1K'],['gold','🥇','10K'],['diamond','💎','100K'],['mythic','👑','1M']].map(x=>`<div class="ds-mini"><span class="emoji">${x[1]}</span><b>${x[0].toUpperCase()}</b><div class="ds-feature-muted">${x[2]} 🪙</div><button class="ds-feature-btn" data-chest="${x[0]}">ÖFFNEN</button></div>`).join('')}</div></div>
      <div class="ds-feature-card ds-wide"><h3>🏃 CHARAKTERE</h3><div class="ds-item-grid">${CHARACTERS.map(c=>{const owned=(s.ownedCharacters||[]).includes(c.id),eq=s.progression?.character===c.id;return `<div class="ds-mini"><span class="emoji">${c.emoji}</span><b>${c.name}</b><div class="ds-feature-muted">${owned?'Besitzt':fmt(c.cost)+' 🪙'}</div><button class="ds-feature-btn ${eq?'primary':''}" data-char="${c.id}" ${owned?'':' '}>${eq?'AKTIV':owned?'AUSRÜSTEN':'KAUFEN'}</button></div>`}).join('')}</div></div>
      <div class="ds-feature-card ds-wide"><h3>✨ TRAILS</h3><div class="ds-item-grid">${TRAILS.map(t=>{const owned=(s.ownedTrails||[]).includes(t.id),eq=s.progression?.trail===t.id;return `<div class="ds-mini"><span class="emoji">${t.emoji}</span><b>${t.name}</b><div class="ds-feature-muted">${owned?'Besitzt':fmt(t.cost)+' 🪙'}</div><button class="ds-feature-btn ${eq?'primary':''}" data-trail="${t.id}">${eq?'AKTIV':owned?'AUSRÜSTEN':'KAUFEN'}</button></div>`}).join('')}</div></div>
      <div class="ds-feature-card ds-wide"><h3>🎯 MISSIONEN</h3>${missionList(s).map(m=>{const p=Math.min(m[2],m[3]),done=p>=m[2],claimed=Boolean(s.missionClaimed?.[m[0]]);return `<div class="ds-feature-row"><div style="flex:1"><b>${m[1]}</b><div class="ds-feature-muted">${fmt(p)} / ${fmt(m[2])} · Reward ${fmt(m[4])} 🪙</div><div class="ds-progress"><span style="width:${(p/m[2])*100}%"></span></div></div><button class="ds-feature-btn" data-mission="${m[0]}" ${done&&!claimed?'':'disabled'}>${claimed?'✓ EINGELÖST':done?'ABHOLEN':'IN PROGRESS'}</button></div>`}).join('')}</div>
      <div class="ds-feature-card"><h3>🎮 DAILY CHALLENGE</h3><div class="ds-feature-muted">Jeden Tag neue harte Vorgabe. 1 Versuch.</div><div class="ds-feature-row"><span>Best Score</span><b>${fmt(s.dailyChallengeBest)}</b></div><button id="dsChallenge" class="ds-feature-btn primary">CHALLENGE STARTEN</button></div>
      <div class="ds-feature-card"><h3>💀 HARDCORE</h3><div class="ds-feature-muted">Keine Upgrades · maximaler Schwierigkeitsgrad.</div><div class="ds-feature-row"><span>Best Score</span><b>${fmt(s.hardcoreBest)}</b></div><button id="dsHardcore" class="ds-feature-btn">HARDCORE</button></div>
      <div class="ds-feature-card ds-season ds-wide"><div class="ds-kicker">LIVE SEASON</div><h3>${SEASON.name}</h3><div class="ds-feature-muted">Season-XP ${fmt(s.season?.xp||0)} · Exklusive Rewards und Ziele.</div><div class="ds-feature-row"><span>Reward 1</span><b>${SEASON.rewards[0]}</b></div><div class="ds-feature-row"><span>Reward 2</span><b>${SEASON.rewards[1]}</b></div></div>
      <div class="ds-feature-card ds-wide"><h3>🏆 ACHIEVEMENTS</h3><div class="ds-item-grid">${ACHIEVEMENTS.map(a=>{const done=(s.achievements||[]).includes(a[0]);return `<div class="ds-mini"><span class="emoji">${done?'🏆':'🔒'}</span><b>${a[1]}</b><div class="ds-feature-muted">${a[2]}</div></div>`}).join('')}</div></div>
      <div class="ds-feature-card ds-wide"><h3>👑 PRESTIGE</h3><div class="ds-feature-muted">Level 20 erreichen, neu starten und dauerhafte Gems/Multiplikator-Vorteile aufbauen.</div><div class="ds-feature-row"><span>Aktuelles Prestige</span><b>${fmt(s.progression?.prestige)}</b></div><button id="dsPrestige" class="ds-feature-btn primary">PRESTIGE</button></div>
      </div>`;

    root.querySelector('#dsDaily').onclick=claimDaily; root.querySelector('#dsChallenge').onclick=challenge; root.querySelector('#dsHardcore').onclick=hardcore; root.querySelector('#dsPrestige').onclick=prestige;
    root.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>{const w=WORLDS.find(x=>x.id===b.dataset.world);if(highest>=w.unlock){SET({progression:{...(SAVE().progression||{}),world:w.id}});toast(`${w.name} ausgewählt`);render();}});
    root.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.upgrade));
    root.querySelectorAll('[data-chest]').forEach(b=>b.onclick=()=>openChest(b.dataset.chest));
    root.querySelectorAll('[data-char]').forEach(b=>b.onclick=()=>{const c=CHARACTERS.find(x=>x.id===b.dataset.char);const ss=SAVE();if((ss.ownedCharacters||[]).includes(c.id))equip('character',c.id);else buy('character',c.id,c.cost);});
    root.querySelectorAll('[data-trail]').forEach(b=>b.onclick=()=>{const t=TRAILS.find(x=>x.id===b.dataset.trail);const ss=SAVE();if((ss.ownedTrails||[]).includes(t.id))equip('trail',t.id);else buy('trail',t.id,t.cost);});
    root.querySelectorAll('[data-mission]').forEach(b=>b.onclick=()=>{const m=missionList(SAVE()).find(x=>x[0]===b.dataset.mission);if(m)claimMission(m[0],m[2],m[4],m[3]);});
  }

  function gameEnhance(){
    style(); if(document.getElementById('dsGameFeature'))return;
    const box=document.createElement('div');box.id='dsGameFeature';box.style.cssText='position:absolute;left:50%;top:max(72px,env(safe-area-inset-top) + 72px);transform:translateX(-50%);z-index:7;pointer-events:none;text-align:center;font:900 13px Inter,system-ui,sans-serif;color:#fff;text-shadow:0 3px 16px #000';box.innerHTML='<div id="dsCombo" style="font-size:22px"></div><div id="dsWeather" style="margin-top:3px;color:#b8c2df"></div><div id="dsClose" style="margin-top:3px;color:#9df3da"></div>';
    document.querySelector('.game')?.appendChild(box);
    let lastDodges=0,combo=0,lastChange=0,lastCoins=0,lastTime=0;
    const weather=['☀️ CLEAR','🌙 NIGHT','🌧️ RAIN','❄️ SNOW','🌫️ FOG','⚡ STORM','🌇 SUNSET'];
    setInterval(()=>{const s=SAVE();const ar=s.progress?.activeRun;if(!ar){combo=0;lastDodges=0;document.getElementById('dsCombo').textContent='';return;}const d=Number(ar.dodged||0);if(d>lastDodges){combo+=d-lastDodges;lastDodges=d;lastChange=Date.now();}if(d<lastDodges)combo=0;lastTime=Number(ar.elapsed||0);const mult=combo>=50?10:combo>=30?5:combo>=15?3:combo>=5?2:1;const el=document.getElementById('dsCombo');el.textContent=combo>=5?`COMBO x${mult} • ${combo}`:'';document.getElementById('dsWeather').textContent=weather[Math.floor(lastTime/18)%weather.length];if(combo>0&&Date.now()-lastChange<700){document.getElementById('dsClose').textContent=combo%7===0?'⚡ PERFECT DODGE! +3':'';}else document.getElementById('dsClose').textContent='';},180);
  }

  function init(){ensure();render();window.addEventListener('dontstop:saved',()=>{try{ensure();render();}catch{}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();