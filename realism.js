(() => {
  'use strict';
  const canvas = document.getElementById('scene');
  const game = document.querySelector('.game');
  if (!canvas || !game || document.getElementById('realisticScene')) return;

  const save = () => { try { return window.DontStopSave?.read?.() || {}; } catch { return {}; } };
  const atmosphere = document.createElement('div');
  atmosphere.className = 'atmosphere';
  atmosphere.innerHTML = '<div class="horizon"></div><div class="vignette"></div><div class="speed-lines"></div><div class="dust"></div>';
  game.insertBefore(atmosphere, game.firstChild);

  const style = document.createElement('style');
  style.textContent = `
    #realisticScene{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
    #realisticScene .rs-road{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(.96) contrast(1.04)}
    #realisticScene .rs-perspective{position:absolute;inset:0;overflow:hidden}
    #realisticScene .rs-player{position:absolute;left:50%;bottom:6.5%;width:min(158px,29vw);transform:translateX(-50%);filter:drop-shadow(0 20px 18px rgba(0,0,0,.5));will-change:left,transform;z-index:4}
    #realisticScene .rs-player img{display:block;width:100%;height:auto}
    #realisticScene .rs-shadow{position:absolute;left:50%;bottom:6%;width:min(120px,23vw);height:20px;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.38);filter:blur(7px);z-index:3}
    #realisticScene .rs-object{position:absolute;left:50%;bottom:53%;width:min(190px,35vw);transform-origin:50% 100%;will-change:left,bottom,transform;filter:drop-shadow(0 15px 16px rgba(0,0,0,.38));z-index:3}
    #realisticScene .rs-object img{display:block;width:100%;height:auto}
    #realisticScene .rs-dodge{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%) scale(.8);padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(10,13,23,.76);color:#fff;font-weight:950;font-size:12px;opacity:0;transition:opacity .12s,transform .12s;white-space:nowrap;z-index:6}
    #realisticScene .rs-dodge.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
    @media(min-width:760px){#realisticScene .rs-player{width:175px}.rs-object{width:210px}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'realisticScene';
  root.innerHTML = '<div class="rs-road"></div><div class="rs-perspective"></div><div class="rs-shadow"></div><div class="rs-dodge">PERFECT DODGE!</div><div class="rs-player"><img alt="Realistischer Runner" src="./assets/avatar-starter.svg"></div>';
  game.insertBefore(root, atmosphere.nextSibling);

  const road = root.querySelector('.rs-road');
  const perspective = root.querySelector('.rs-perspective');
  const player = root.querySelector('.rs-player');
  const avatarImg = root.querySelector('.rs-player img');
  const shadow = root.querySelector('.rs-shadow');
  const dodge = root.querySelector('.rs-dodge');
  if (!road || !perspective || !player || !avatarImg || !shadow || !dodge) return;

  const worldAssets = {city:'./assets/world-city.svg',night:'./assets/world-night.svg',desert:'./assets/world-desert.svg',snow:'./assets/world-snow.svg',cyber:'./assets/world-cyber.svg',volcano:'./assets/world-volcano.svg'};
  const avatarAssets = {starter:'./assets/avatar-starter.svg',speedster:'./assets/avatar-speed.svg',collector:'./assets/avatar-starter.svg',ninja:'./assets/avatar-elite.svg',robot:'./assets/avatar-armor.svg',void:'./assets/avatar-elite.svg'};
  const obstacleAssets = ['./assets/obstacle-car.svg','./assets/obstacle-barrier.svg','./assets/obstacle-construction.svg'];
  const lanePercent = [-30,0,30];
  const objects = [];
  let currentWorld=''; let currentAvatar=''; let lane=1; let jumpUntil=0; let spawnTimer=.5; let last=performance.now(); let seed=742391; let wasRunning=false; let lastScore=0;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const isRunning=()=>document.getElementById('overlay')?.classList.contains('hidden')===true;
  const currentLevel=()=>Math.max(1,Math.min(20,Number(save().selectedLevel||1)));
  const setWorld=s=>{const id=s.progression?.world||'city';if(id!==currentWorld){currentWorld=id;road.style.backgroundImage=`url('${worldAssets[id]||worldAssets.city}')`;}};
  const setAvatar=s=>{const id=s.progression?.character||'starter';if(id!==currentAvatar){currentAvatar=id;avatarImg.src=avatarAssets[id]||avatarAssets.starter;}};
  const clearObjects=()=>{while(objects.length)objects.pop().el.remove();};
  const spawn=()=>{const wrap=document.createElement('div');wrap.className='rs-object';const img=document.createElement('img');img.src=obstacleAssets[Math.floor(rand()*obstacleAssets.length)];img.alt='Realistisches Straßenhindernis';wrap.appendChild(img);const l=Math.floor(rand()*3);wrap.dataset.lane=String(l);perspective.appendChild(wrap);objects.push({el:wrap,lane:l,progress:0,speed:.9+rand()*.16});};
  const showDodge=()=>{dodge.classList.add('show');clearTimeout(showDodge.timer);showDodge.timer=setTimeout(()=>dodge.classList.remove('show'),420);};
  document.addEventListener('click',e=>{const id=e.target?.id;if(id==='leftBtn')lane=Math.max(0,lane-1);else if(id==='rightBtn')lane=Math.min(2,lane+1);else if(id==='jumpBtn')jumpUntil=performance.now()+360;});
  document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(e.key==='ArrowLeft'||k==='a')lane=Math.max(0,lane-1);else if(e.key==='ArrowRight'||k==='d')lane=Math.min(2,lane+1);else if(e.key==='ArrowUp'||k==='w'||e.code==='Space')jumpUntil=performance.now()+360;});

  const frame=now=>{
    const dt=Math.min(.045,Math.max(0,(now-last)/1000));last=now;const s=save();const active=isRunning();const level=currentLevel();setWorld(s);setAvatar(s);
    if(active){
      if(!wasRunning){clearObjects();spawnTimer=.5;seed=742391+level;wasRunning=true;}
      const savedLane=Number(s.progress?.lane);if(Number.isFinite(savedLane))lane=Math.max(0,Math.min(2,Math.round(savedLane)));
      spawnTimer-=dt*(1+level*.02);if(spawnTimer<=0){spawn();spawnTimer=Math.max(.52,1.05-level*.02);}
      const travelSpeed=.68+level*.02;
      for(let i=objects.length-1;i>=0;i--){const o=objects[i];o.progress+=dt*travelSpeed*o.speed;const p=Math.min(1,o.progress);const bottom=53-p*47;const scale=.18+p*1.15;const laneSpread=lanePercent[o.lane]*(.25+p*.75);o.el.style.left=`calc(50% + ${laneSpread}%)`;o.el.style.bottom=`${bottom}%`;o.el.style.transform=`translateX(-50%) scale(${scale})`;if(p>=1){if(o.lane!==lane)showDodge();o.el.remove();objects.splice(i,1);}}
      const jumping=performance.now()<jumpUntil;player.style.left=`calc(50% + ${lanePercent[lane]}%)`;player.style.transform=`translateX(-50%) translateY(${jumping?-72:0}px) rotateZ(${lane===0?-2:lane===2?2:0}deg)`;shadow.style.transform=`translateX(-50%) scaleX(${jumping?.68:1})`;shadow.style.opacity=jumping?.45:.78;
      const score=Number((document.getElementById('score')?.textContent||'0').replace(/[^0-9]/g,''))||0;if(score>lastScore&&score%500<20)showDodge();lastScore=score;
    }else{wasRunning=false;clearObjects();spawnTimer=.5;lane=Math.max(0,Math.min(2,Math.round(Number(s.progress?.lane??1))));player.style.left=`calc(50% + ${lanePercent[lane]}%)`;player.style.transform='translateX(-50%)';shadow.style.opacity='.72';}
    atmosphere.style.setProperty('--speed-opacity',String(.08+level*.014));atmosphere.style.setProperty('--horizon-opacity',String(.34+level*.015));requestAnimationFrame(frame);
  };
  canvas.style.opacity='.12';setWorld(save());setAvatar(save());requestAnimationFrame(frame);
})();
