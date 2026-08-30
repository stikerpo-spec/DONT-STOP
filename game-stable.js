(() => {
  'use strict';

  const canvas = document.getElementById('scene');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const jumpBtn = document.getElementById('jumpBtn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const coinsEl = document.getElementById('coins');
  const levelEl = document.getElementById('level');
  const savePill = document.getElementById('savePill');
  if (![canvas,overlay,overlayText,startBtn,resumeBtn,leftBtn,rightBtn,jumpBtn,scoreEl,bestEl,coinsEl,levelEl,savePill].every(Boolean)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) { overlayText.textContent='Grafik konnte nicht initialisiert werden.'; return; }

  const LEVEL_NAMES = ['NORMAL','SCHNELL','HART','EXTREM','CHAOS','TURBO','NERVEN','RISKANT','BRUTAL','MASTER','APEX','INSANE','NIGHTMARE','OVERLOAD','MERCILESS','GODLIKE','APOCALYPSE','IMPOSSIBLE','LEGEND','ULTIMATE'];
  const WORLD_IMAGES = {city:'./assets/world-city.svg',night:'./assets/world-night.svg',desert:'./assets/world-desert.svg',snow:'./assets/world-snow.svg',cyber:'./assets/world-cyber.svg',volcano:'./assets/world-volcano.svg'};
  const AVATARS = {starter:'./assets/avatar-starter.svg',speed:'./assets/avatar-speed.svg',armor:'./assets/avatar-armor.svg',elite:'./assets/avatar-elite.svg'};
  const OBSTACLES = ['./assets/obstacle-car.svg','./assets/obstacle-barrier.svg','./assets/obstacle-construction.svg'];
  const laneX = [-0.3,0,0.3];
  const imageCache = new Map();
  const loadImage = src => { if(imageCache.has(src)) return imageCache.get(src); const img=new Image(); img.src=src; imageCache.set(src,img); return img; };

  let state = window.DontStopSave?.read?.() || {coins:0,bestScore:0,progression:{world:'city',character:'starter'},selectedLevel:1,progress:{lane:1}};
  let running = false, paused = false, last = performance.now(), elapsed = 0, score = 0, runCoins = 0, dodged = 0;
  let lane = Math.max(0,Math.min(2,Math.round(Number(state.progress?.lane ?? 1))));
  let jumpUntil = 0, spawnTimer = 0.8, combo = 0, bestCombo = Number(state.bestCombo||0);
  let objects = [], touchStartX=0, touchStartY=0, raf=0;

  function level(){ return Math.max(1,Math.min(20,Number((window.DontStopSave?.read?.()||state).selectedLevel||1))); }
  function config(){ const l=level(); return {speed:0.23+l*0.009, spawn:Math.max(0.42,1.08-l*0.024)}; }
  function fmt(n){return Math.max(0,Math.floor(Number(n)||0)).toLocaleString('de-DE');}
  function save(){ try { state = window.DontStopSave.read(); return true; } catch { return false; } }
  function setHud(){ state=window.DontStopSave?.read?.()||state; scoreEl.textContent=fmt(score); bestEl.textContent=fmt(state.bestScore||0); coinsEl.textContent=fmt(Number(state.coins||0)+runCoins); levelEl.textContent=`${level()} • ${LEVEL_NAMES[level()-1]}`; }
  function saveRun(activeRun=true){
    const patch={selectedLevel:level(),progress:{...(state.progress||{}),lane,activeRun:activeRun?{score:Math.floor(score),elapsed,runCoins,dodged,lane,selectedLevel:level()}:null}};
    try { window.DontStopSave.set(patch); state=window.DontStopSave.read(); savePill.textContent='GESPEICHERT'; return true; } catch { savePill.textContent='SAVE FEHLER'; return false; }
  }
  function clearObjects(){ objects=[]; }
  function resetRun(){ elapsed=0;score=0;runCoins=0;dodged=0;combo=0;bestCombo=Number(state.bestCombo||0);spawnTimer=.8;clearObjects();jumpUntil=0;lane=Math.max(0,Math.min(2,Math.round(Number(state.progress?.lane??1)))); }
  function startRun(resume=false){
    state=window.DontStopSave?.read?.()||state;
    const active=state.progress?.activeRun;
    resetRun();
    if(resume&&active){ score=Number(active.score||0);elapsed=Number(active.elapsed||0);runCoins=Number(active.runCoins||0);dodged=Number(active.dodged||0);lane=Math.max(0,Math.min(2,Math.round(Number(active.lane??lane)))); }
    else { saveRun(true); }
    running=true;paused=false;overlay.classList.add('hidden');startBtn.hidden=false;resumeBtn.hidden=true;last=performance.now();setHud(); cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }
  function pauseRun(){ if(!running)return; paused=true;running=false;cancelAnimationFrame(raf);saveRun(true);overlay.classList.remove('hidden');startBtn.hidden=true;resumeBtn.hidden=false;overlayText.textContent='Run gespeichert. Drücke RUN FORTSETZEN.'; }
  function endRun(reason='Getroffen!'){
    if(!running)return; running=false;paused=false;cancelAnimationFrame(raf);
    state=window.DontStopSave?.read?.()||state;
    const previousBest=Number(state.bestScore||0), final=Math.floor(score);
    const stats=state.statistics||{};
    window.DontStopSave?.set?.({bestScore:Math.max(previousBest,final),bestTime:Math.max(Number(state.bestTime||0),elapsed),bestCombo:Math.max(Number(state.bestCombo||0),bestCombo),coins:Number(state.coins||0)+runCoins,statistics:{...stats,totalRuns:Number(stats.totalRuns||0),totalTime:Number(stats.totalTime||0)+elapsed,totalDodges:Number(stats.totalDodges||0)+dodged},progress:{...(state.progress||{}),lane,activeRun:null}});
    state=window.DontStopSave?.read?.()||state;setHud();savePill.textContent='GESPEICHERT';overlay.classList.remove('hidden');startBtn.hidden=false;resumeBtn.hidden=true;
    overlayText.innerHTML=`${reason}<br><br>Level ${level()} • ${LEVEL_NAMES[level()-1]}<br>Score: <strong>${fmt(final)}</strong><br>Ausgewichen: <strong>${fmt(dodged)}</strong><br>Coins: <strong>+${fmt(runCoins)}</strong>${final>previousBest?'<br><strong>🏆 NEUER REKORD!</strong>':''}`;
    draw();
  }
  function move(d){if(!running)return;lane=Math.max(0,Math.min(2,lane+d));}
  function jump(){if(!running||performance.now()<jumpUntil)return;jumpUntil=performance.now()+430;}
  function spawn(){
    const safe=Math.floor(Math.random()*3);
    const blocked=[];
    if(level()<3 || Math.random()>0.2) blocked.push((safe+1)%3);
    else { blocked.push((safe+1)%3); if(Math.random()<Math.min(.8,level()*.035)) blocked.push((safe+2)%3); }
    const image=OBSTACLES[Math.floor(Math.random()*OBSTACLES.length)];
    blocked.forEach((l,i)=>objects.push({kind:'obstacle',lane:l,z:0,img:image,passed:false,height:1.6+i*.05}));
    if(Math.random()<0.72) objects.push({kind:'coin',lane:safe,z:0.02,img:null,passed:false});
  }
  function project(z){ const horizon=0.38, bottom=0.93, p=Math.max(0,Math.min(1,z)); const eased=p*p; return {y:canvas.height*(horizon+(bottom-horizon)*eased),scale:0.18+eased*1.15,spread:canvas.width*(0.055+eased*0.40)}; }
  function drawRoad(){
    const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
    const world=(state.progression?.world)||'city'; const bg=loadImage(WORLD_IMAGES[world]||WORLD_IMAGES.city);
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#07152e');g.addColorStop(.45,'#102d4b');g.addColorStop(1,'#050711');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    if(bg.complete&&bg.naturalWidth){ctx.globalAlpha=.55;ctx.drawImage(bg,0,0,w,h);ctx.globalAlpha=1;}
    const horizonY=h*.38; ctx.fillStyle='rgba(10,12,18,.88)';ctx.beginPath();ctx.moveTo(w*.38,h);ctx.lineTo(w*.62,h);ctx.lineTo(w*.53,horizonY);ctx.lineTo(w*.47,horizonY);ctx.closePath();ctx.fill();
    for(let i=1;i<7;i++){const z=i/7, y=h*(.38+.55*z*z), half=w*(.055+.40*z*z);ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=Math.max(1,w*.002);ctx.beginPath();ctx.moveTo(w/2-half,y);ctx.lineTo(w/2+half,y);ctx.stroke();}
    [-.15,.15].forEach(x=>{ctx.strokeStyle='rgba(255,220,80,.75)';ctx.lineWidth=Math.max(2,w*.005);ctx.beginPath();ctx.moveTo(w/2+w*x*.08,h*.94);ctx.lineTo(w/2+w*x*.01,horizonY);ctx.stroke();});
  }
  function draw(){
    drawRoad(); const p=project(1); const playerX=canvas.width/2+laneX[lane]*p.spread; const jumping=performance.now()<jumpUntil; const avatarId=state.progression?.character||'starter'; const avatarSrc=AVATARS[avatarId]||AVATARS.starter; const avatar=loadImage(avatarSrc);
    ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=18;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(playerX,canvas.height*.92,canvas.width*.06,canvas.height*.018,0,0,Math.PI*2);ctx.fill();ctx.restore();
    if(avatar.complete&&avatar.naturalWidth){const ah=canvas.height*(jumping?.20:.24),aw=ah*(avatar.naturalWidth/avatar.naturalHeight);ctx.drawImage(avatar,playerX-aw/2,canvas.height*(jumping?.66:.70)-ah,aw,ah);}else{ctx.fillStyle='#42ddb8';ctx.fillRect(playerX-28,canvas.height*.72,56,110);}
    for(const o of objects){const q=project(o.z),x=canvas.width/2+laneX[o.lane]*q.spread;if(o.kind==='coin'){const r=Math.max(7,canvas.width*.012*q.scale);ctx.fillStyle='#ffe27a';ctx.beginPath();ctx.arc(x,q.y-r*1.8,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff4b0';ctx.font=`${Math.max(10,r*1.2)}px sans-serif`;ctx.textAlign='center';ctx.fillText('★',x,q.y-r*1.45);}else{const img=loadImage(o.img), ww=canvas.width*.11*q.scale, hh=ww*(img.naturalHeight&&img.naturalWidth?img.naturalHeight/img.naturalWidth:.7);if(img.complete&&img.naturalWidth)ctx.drawImage(img,x-ww/2,q.y-hh,ww,hh);else{ctx.fillStyle='#d93455';ctx.fillRect(x-ww/2,q.y-hh,ww,hh);}}}
    if(combo>=5){ctx.textAlign='center';ctx.font='900 22px system-ui';ctx.fillStyle='#fff';ctx.fillText(`COMBO x${combo>=50?10:combo>=30?5:combo>=15?3:2} • ${combo}`,canvas.width/2,canvas.height*.19);}
  }
  function updateObjects(dt){
    const c=config(); spawnTimer-=dt*(1+level()*.02); if(spawnTimer<=0){spawn();spawnTimer=c.spawn;}
    const jumping=performance.now()<jumpUntil;
    for(let i=objects.length-1;i>=0;i--){const o=objects[i];o.z+=dt*c.speed;
      if(o.kind==='coin'&&!o.passed&&o.z>.82&&o.z<.98&&o.lane===lane){o.passed=true;runCoins+=1;continue;}
      if(o.kind==='obstacle'&&!o.passed&&o.z>.84&&o.z<.99){
        if(o.lane===lane&&!jumping){endRun('💥 Hindernis getroffen!');return false;}
        if(o.lane!==lane||jumping){o.passed=true;dodged+=1;combo+=1;bestCombo=Math.max(bestCombo,combo);runCoins+=1;}
      }
      if(o.z>1.05)objects.splice(i,1);
    }
    return true;
  }
  function loop(now){ if(!running)return; const dt=Math.min(.045,Math.max(0,(now-last)/1000));last=now;elapsed+=dt;score+=dt*(100+level()*28+elapsed*(2+level()*.1));if(!updateObjects(dt))return;setHud();if(elapsed%0.8<dt)saveRun(true);draw();raf=requestAnimationFrame(loop); }

  startBtn.addEventListener('click',()=>startRun(false));
  resumeBtn.addEventListener('click',()=>startRun(true));
  leftBtn.addEventListener('click',()=>move(-1)); rightBtn.addEventListener('click',()=>move(1)); jumpBtn.addEventListener('click',jump);
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(e.key==='ArrowLeft'||k==='a'){e.preventDefault();move(-1);}else if(e.key==='ArrowRight'||k==='d'){e.preventDefault();move(1);}else if(e.key==='ArrowUp'||k==='w'||e.code==='Space'){e.preventDefault();jump();}else if(e.key==='Escape'&&running)pauseRun();});
  canvas.addEventListener('touchstart',e=>{const t=e.changedTouches[0];if(t){touchStartX=t.clientX;touchStartY=t.clientY;}},{passive:true});
  canvas.addEventListener('touchend',e=>{const t=e.changedTouches[0];if(!t)return;const dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;if(Math.max(Math.abs(dx),Math.abs(dy))<28)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);else if(dy<0)jump();},{passive:true});
  window.addEventListener('resize',draw);
  state=window.DontStopSave?.read?.()||state;setHud();draw();
})();
