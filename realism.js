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

  const username = (() => { try { return localStorage.getItem('dontStopSessionV1') || ''; } catch { return ''; } })();
  if (username) {
    const name = document.createElement('div');
    name.className = 'runner-name'; name.textContent = username; game.appendChild(name);
  }

  const style = document.createElement('style');
  style.textContent = `
    #realisticScene{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;perspective:950px}
    #realisticScene .rs-road{position:absolute;inset:0;background-size:cover;background-position:center;transition:background-image .2s ease}
    #realisticScene .rs-road:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,10,18,.05),rgba(2,4,9,.08) 54%,rgba(2,3,6,.42) 100%)}
    #realisticScene .rs-perspective{position:absolute;inset:0;overflow:hidden;transform-style:preserve-3d}
    #realisticScene .rs-player{position:absolute;left:50%;bottom:6.5%;width:min(158px,29vw);transform:translateX(-50%);filter:drop-shadow(0 20px 18px rgba(0,0,0,.48));will-change:left,transform}
    #realisticScene .rs-player img{display:block;width:100%;height:auto}
    #realisticScene .rs-shadow{position:absolute;left:50%;bottom:6%;width:min(120px,23vw);height:20px;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.38);filter:blur(7px)}
    #realisticScene .rs-object{position:absolute;left:50%;top:-230px;width:min(190px,35vw);will-change:top,transform;filter:drop-shadow(0 15px 16px rgba(0,0,0,.38))}
    #realisticScene .rs-object img{display:block;width:100%;height:auto}
    #realisticScene .rs-dodge{position:absolute;left:50%;top:55%;transform:translate(-50%,-50%) scale(.8);padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(10,13,23,.7);color:#fff;font-weight:950;font-size:12px;opacity:0;transition:opacity .12s,transform .12s;white-space:nowrap}
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
  const avatarAssets = {starter:'./assets/avatar-starter.svg',speed:'./assets/avatar-speed.svg',armor:'./assets/avatar-armor.svg',elite:'./assets/avatar-elite.svg'};
  const obstacleAssets = ['./assets/obstacle-car.svg','./assets/obstacle-barrier.svg','./assets/obstacle-construction.svg'];
  const lanes = [-30,0,30];
  const objects = [];
  let currentWorld = '';
  let currentAvatar = '';
  let lane = 1;
  let jumpUntil = 0;
  let nextSpawn = .85;
  let last = performance.now();
  let seed = 742391;
  let wasRunning = false;
  let lastScore = 0;

  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const running = () => document.getElementById('overlay')?.classList.contains('hidden') === true;
  const currentLevel = () => Math.max(1, Math.min(20, Number(save().selectedLevel || 1)));
  const setWorld = s => { const id=s.progression?.world||'city'; if(id!==currentWorld){currentWorld=id;road.style.backgroundImage=`url('${worldAssets[id]||worldAssets.city}')`;}};
  const setAvatar = s => { const id=s.avatar?.skin||'starter'; if(id!==currentAvatar){currentAvatar=id;avatarImg.src=avatarAssets[id]||avatarAssets.starter;}};
  const removeObjects = () => { while(objects.length){const o=objects.pop();o.el.remove();} };
  const spawn = () => { const el=document.createElement('div');el.className='rs-object';const img=document.createElement('img');img.src=obstacleAssets[Math.floor(rand()*obstacleAssets.length)];img.alt='Straßenhindernis';el.appendChild(img);const l=Math.floor(rand()*3);el.dataset.lane=String(l);el.style.left=`calc(50% + ${lanes[l]}%)`;const o={el,z:-220,speed:.92+rand()*.18};perspective.appendChild(el);objects.push(o);};
  const showDodge = () => {dodge.classList.add('show');clearTimeout(showDodge.t);showDodge.t=setTimeout(()=>dodge.classList.remove('show'),180);};

  document.addEventListener('click', e => { const id=e.target?.id; if(id==='leftBtn')lane=Math.max(0,lane-1); if(id==='rightBtn')lane=Math.min(2,lane+1); if(id==='jumpBtn')jumpUntil=performance.now()+340; });
  document.addEventListener('keydown', e => { const k=e.key.toLowerCase(); if(e.key==='ArrowLeft'||k==='a')lane=Math.max(0,lane-1); if(e.key==='ArrowRight'||k==='d')lane=Math.min(2,lane+1); if(e.key==='ArrowUp'||k==='w'||e.code==='Space')jumpUntil=performance.now()+340; });

  const frame = now => {
    const dt=Math.min(.045,Math.max(0,(now-last)/1000));last=now;
    const s=save();setWorld(s);setAvatar(s);
    const active=running();
    const level=currentLevel();
    const scoreText=document.getElementById('score')?.textContent||'0';
    const score=Number(scoreText.replace(/[^0-9]/g,''))||0;
    if(active){
      if(!wasRunning){removeObjects();nextSpawn=.65;seed=742391+level;wasRunning=true;}
      lane=Math.max(0,Math.min(2,Math.round(Number(s.progress?.lane??lane))));
      const speed=310+level*14;
      nextSpawn-=dt*(1+level*.022);
      if(nextSpawn<=0){spawn();nextSpawn=Math.max(.38,1.02-level*.025);}
      for(let i=objects.length-1;i>=0;i--){const o=objects[i];o.z+=dt*speed*o.speed;const depth=Math.max(0,Math.min(1,(o.z+220)/650));const scale=.48+depth*1.05;o.el.style.top=`${o.z}px`;o.el.style.transform=`translateX(-50%) scale(${scale}) rotateY(${Math.sin(now/460+i)*2}deg)`;if(o.z>innerHeight*.92){if(o.el.dataset.lane!==String(lane))showDodge();o.el.remove();objects.splice(i,1);}}
      const jumping=performance.now()<jumpUntil;player.style.left=`calc(50% + ${lanes[lane]}%)`;player.style.transform=`translateX(-50%) translateY(${jumping?-70:0}px) rotateZ(${lane===0?-2:lane===2?2:0}deg)`;shadow.style.transform=`translateX(-50%) scale(${jumping?.7:1})`;shadow.style.opacity=jumping?.45:.75;
      if(score>lastScore && score%500<40)showDodge();lastScore=score;
    } else {
      wasRunning=false;removeObjects();lane=Math.max(0,Math.min(2,Math.round(Number(s.progress?.lane??1))));player.style.left=`calc(50% + ${lanes[lane]}%)`;player.style.transform='translateX(-50%)';shadow.style.opacity=.72;
    }
    const intensity=.10+level*.018;atmosphere.style.setProperty('--speed-opacity',String(intensity));atmosphere.style.setProperty('--horizon-opacity',String(.34+level*.018));
    requestAnimationFrame(frame);
  };

  canvas.style.opacity='.18';
  setWorld(save());setAvatar(save());
  requestAnimationFrame(frame);
})();