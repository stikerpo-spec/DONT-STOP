(() => {
  'use strict';
  if (!document.getElementById('scene') || document.getElementById('realisticScene')) return;

  const style = document.createElement('style');
  style.textContent = `
    #realisticScene{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;perspective:900px;}
    #realisticScene .rs-road{position:absolute;inset:0;background-size:cover;background-position:center;transition:background-image .25s ease;filter:saturate(.95) contrast(1.04)}
    #realisticScene .rs-road:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,14,26,.08) 0%,rgba(8,10,15,.02) 45%,rgba(3,4,8,.38) 100%)}
    #realisticScene .rs-perspective{position:absolute;inset:0;overflow:hidden;transform-style:preserve-3d}
    #realisticScene .rs-player{position:absolute;left:50%;bottom:7.5%;width:min(150px,27vw);transform:translateX(-50%) translateZ(80px);transform-origin:50% 100%;filter:drop-shadow(0 18px 18px rgba(0,0,0,.42));transition:left .16s ease,transform .11s ease}
    #realisticScene .rs-player img{width:100%;display:block}
    #realisticScene .rs-shadow{position:absolute;left:50%;bottom:7.2%;width:min(110px,20vw);height:18px;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.34);filter:blur(6px)}
    #realisticScene .rs-object{position:absolute;top:-220px;width:min(180px,32vw);transform:translateX(-50%);will-change:transform,top;filter:drop-shadow(0 16px 14px rgba(0,0,0,.36))}
    #realisticScene .rs-object img{width:100%;display:block}
    #realisticScene .rs-glow{position:absolute;left:50%;bottom:18%;width:min(320px,65vw);height:130px;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(255,255,255,.08),transparent 70%);filter:blur(8px)}
    @media(min-width:760px){#realisticScene .rs-player{width:165px}.rs-object{width:190px}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'realisticScene';
  root.innerHTML = `<div class="rs-road"></div><div class="rs-glow"></div><div class="rs-perspective"></div><div class="rs-shadow"></div><img class="rs-player" alt="Runner" src="./assets/avatar-starter.svg">`;
  const game = document.querySelector('.game');
  game?.insertBefore(root, game.firstChild);
  if (!game) return;

  const road = root.querySelector('.rs-road');
  const perspective = root.querySelector('.rs-perspective');
  const player = root.querySelector('.rs-player');
  if (!road || !perspective || !player) return;

  const laneX = [-28, 0, 28];
  const obstacleAssets = ['./assets/obstacle-car.svg','./assets/obstacle-barrier.svg','./assets/obstacle-construction.svg'];
  const worldAssets = {
    city: './assets/world-city.svg',
    night: './assets/world-night.svg',
    desert: './assets/world-desert.svg',
    snow: './assets/world-snow.svg',
    cyber: './assets/world-cyber.svg',
    volcano: './assets/world-volcano.svg'
  };

  const readSave = () => { try { return window.DontStopSave?.read?.() || {}; } catch { return {}; } };
  const isRunning = () => { const overlay=document.getElementById('overlay'); return overlay && overlay.classList.contains('hidden'); };
  let last = performance.now();
  let nextSpawn = 0.8;
  let playerJump = 0;
  let playerLane = 1;
  let runningSince = 0;
  let seed = 1234567;
  const objects = [];

  function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  function selectWorld(){const s=readSave();const world=s.progression?.world||'city';road.style.backgroundImage=`url('${worldAssets[world]||worldAssets.city}')`;}
  function setPlayer(){player.style.left=`calc(50% + ${laneX[playerLane]}%)`;player.style.transform=`translateX(-50%) translateY(${-playerJump}px)`;}
  function spawn(){
    const el=document.createElement('img');
    el.className='rs-object';
    el.src=obstacleAssets[Math.floor(rand()*obstacleAssets.length)];
    el.alt='Hindernis';
    const lane=Math.floor(rand()*3);
    const depth=Math.max(0,Math.min(1,rand()));
    const obj={el,lane,z:-180-depth*60,speed:0.85+rand()*0.28,depth};
    el.style.left=`calc(50% + ${laneX[lane]}%)`;
    el.style.width=`${135+depth*55}px`;
    perspective.appendChild(el);objects.push(obj);
  }
  function animate(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;
    selectWorld();
    const active=isRunning();
    const score=Number(document.getElementById('score')?.textContent?.replace(/\./g,'')||0);
    if(active){
      if(!runningSince)runningSince=now;
      const s=readSave();
      const level=Math.max(1,Math.min(20,Number(s.selectedLevel||1)));
      const speed=1.15+level*.045;
      const desiredLane=Number(s.progress?.lane ?? playerLane);
      if(Number.isFinite(desiredLane))playerLane=Math.max(0,Math.min(2,Math.round(desiredLane)));
      playerJump=Math.max(0, playerJump-dt*420);
      if(nextSpawn<=0){spawn();nextSpawn=Math.max(.38,1.18-level*.032);}
      nextSpawn-=dt*speed/1.15;
      for(let i=objects.length-1;i>=0;i--){const o=objects[i];o.z+=dt*(330+level*15)*o.speed;o.el.style.top=`${o.z}px`;const scale=Math.max(.58,Math.min(1.32,(o.z+190)/340));o.el.style.transform=`translateX(-50%) scale(${scale})`;if(o.z>innerHeight*.92){o.el.remove();objects.splice(i,1);}}
      const dodgePulse=(score%120)<2;
      root.style.setProperty('--rs-running','1');
      if(dodgePulse)player.style.filter='drop-shadow(0 18px 18px rgba(0,0,0,.42)) brightness(1.06)';
      else player.style.filter='drop-shadow(0 18px 18px rgba(0,0,0,.42))';
    } else {
      runningSince=0;nextSpawn=.7;
      for(let i=objects.length-1;i>=0;i--){objects[i].el.remove();objects.splice(i,1);}
      playerJump=0;
      const s=readSave();playerLane=Math.max(0,Math.min(2,Math.round(Number(s.progress?.lane ?? 1))));
    }
    setPlayer();requestAnimationFrame(animate);
  }

  document.addEventListener('click',e=>{
    const id=e.target?.id;
    if(id==='jumpBtn'){playerJump=105;setTimeout(()=>{playerJump=0;},260);}
    if(id==='leftBtn')playerLane=Math.max(0,playerLane-1);
    if(id==='rightBtn')playerLane=Math.min(2,playerLane+1);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='ArrowUp'||e.key.toLowerCase()==='w'||e.code==='Space'){playerJump=105;setTimeout(()=>{playerJump=0;},260);}
    if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')playerLane=Math.max(0,playerLane-1);
    if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')playerLane=Math.min(2,playerLane+1);
  });
  selectWorld();setPlayer();requestAnimationFrame(animate);
})();