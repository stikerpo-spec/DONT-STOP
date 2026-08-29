(() => {
  'use strict';

  const canvas = document.getElementById('scene');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const savePill = document.getElementById('savePill');
  const leftBtn = document.getElementById('leftBtn');
  const jumpBtn = document.getElementById('jumpBtn');
  const rightBtn = document.getElementById('rightBtn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const coinsEl = document.getElementById('coins');
  const levelEl = document.getElementById('level');

  if (!canvas || !overlay || !overlayText || !startBtn || !resumeBtn || !savePill || !leftBtn || !jumpBtn || !rightBtn || !scoreEl || !bestEl || !coinsEl || !levelEl) return;
  if (!window.DontStopSave) {
    overlayText.textContent = 'Der Spielstand konnte nicht geladen werden.';
    return;
  }

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!gl) {
    overlayText.textContent = '3D wird von diesem Gerät nicht unterstützt. Bitte die aktuelle App oder einen aktuellen Browser verwenden.';
    return;
  }

  const LANES = [-2.35, 0, 2.35];
  const DEFAULT_LANE = 1;
  const PLAYER_Z = 1.1;
  const LEVELS = {
    1: { name: 'NORMAL', speed: 11.0, spawn: 1.30, ramp: 0.10, doubleAfter: 999, doubleChance: 0 },
    2: { name: 'SCHNELL', speed: 13.0, spawn: 1.12, ramp: 0.13, doubleAfter: 10, doubleChance: 0.10 },
    3: { name: 'HART', speed: 15.2, spawn: 0.98, ramp: 0.16, doubleAfter: 8, doubleChance: 0.18 },
    4: { name: 'EXTREM', speed: 17.5, spawn: 0.87, ramp: 0.19, doubleAfter: 7, doubleChance: 0.24 },
    5: { name: 'CHAOS', speed: 20.0, spawn: 0.76, ramp: 0.23, doubleAfter: 6, doubleChance: 0.30 }
  };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const format = n => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('de-DE');

  const vertexShaderSource = `attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uModel; uniform mat4 uView; uniform mat4 uProjection; varying vec3 vNormal; void main(){vNormal=mat3(uModel)*aNormal;gl_Position=uProjection*uView*uModel*vec4(aPosition,1.0);}`;
  const fragmentShaderSource = `precision mediump float; uniform vec3 uColor; varying vec3 vNormal; void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-0.35,1.0,0.45));float diffuse=max(dot(n,light),0.0);float shade=0.38+diffuse*0.62;gl_FragColor=vec4(uColor*shade,1.0);}`;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader konnte nicht erstellt werden.');
    gl.shaderSource(shader, source);gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message=gl.getShaderInfoLog(shader)||'Shader-Fehler';gl.deleteShader(shader);throw new Error(message); }
    return shader;
  }

  function createProgram() {
    const program=gl.createProgram();if(!program)throw new Error('WebGL-Programm konnte nicht erstellt werden.');
    const vertex=compileShader(gl.VERTEX_SHADER,vertexShaderSource),fragment=compileShader(gl.FRAGMENT_SHADER,fragmentShaderSource);
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Programm-Link-Fehler');
    return program;
  }

  let program;
  try { program=createProgram(); } catch(error) { overlayText.textContent=`3D konnte nicht initialisiert werden: ${error.message}`;return; }
  gl.useProgram(program);

  const locations={position:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),model:gl.getUniformLocation(program,'uModel'),view:gl.getUniformLocation(program,'uView'),projection:gl.getUniformLocation(program,'uProjection'),color:gl.getUniformLocation(program,'uColor')};
  const cubeVertices=new Float32Array([
    -0.5,-0.5,-0.5,0,0,-1, 0.5,-0.5,-0.5,0,0,-1, 0.5,0.5,-0.5,0,0,-1, -0.5,0.5,-0.5,0,0,-1,
    -0.5,-0.5,0.5,0,0,1, 0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1, -0.5,0.5,0.5,0,0,1,
    -0.5,-0.5,-0.5,-1,0,0, -0.5,0.5,-0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0, -0.5,-0.5,0.5,-1,0,0,
    0.5,-0.5,-0.5,1,0,0, 0.5,0.5,-0.5,1,0,0, 0.5,0.5,0.5,1,0,0, 0.5,-0.5,0.5,1,0,0,
    -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0, -0.5,-0.5,0.5,0,-1,0,
    -0.5,0.5,-0.5,0,1,0, 0.5,0.5,-0.5,0,1,0, 0.5,0.5,0.5,0,1,0, -0.5,0.5,0.5,0,1,0
  ]);
  const cubeIndices=new Uint16Array([0,1,2,0,2,3,4,6,5,4,7,6,8,9,10,8,10,11,12,14,13,12,15,14,16,17,18,16,18,19,20,22,21,20,23,22]);
  const vertexBuffer=gl.createBuffer(),indexBuffer=gl.createBuffer();
  if(!vertexBuffer||!indexBuffer){overlayText.textContent='3D konnte keine Grafikdaten anlegen.';return;}
  gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,cubeVertices,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,cubeIndices,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(locations.position);gl.enableVertexAttribArray(locations.normal);gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
  gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(locations.normal,3,gl.FLOAT,false,24,12);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearDepth(1);

  const mat4=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return out;}
  function translation(x,y,z){const m=mat4();m[12]=x;m[13]=y;m[14]=z;return m;}
  function scale(x,y,z){const m=mat4();m[0]=x;m[5]=y;m[10]=z;return m;}
  function rotationY(a){const c=Math.cos(a),s=Math.sin(a),m=mat4();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
  function rotationX(a){const c=Math.cos(a),s=Math.sin(a),m=mat4();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
  function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far),m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m;}
  function lookAt(eye,target,up=[0,1,0]){let zx=eye[0]-target[0],zy=eye[1]-target[1],zz=eye[2]-target[2],zl=Math.hypot(zx,zy,zz)||1;zx/=zl;zy/=zl;zz/=zl;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx,xl=Math.hypot(xx,xy,xz)||1;xx/=xl;xy/=xl;xz/=xl;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx,m=mat4();m[0]=xx;m[1]=yx;m[2]=zx;m[4]=xy;m[5]=yy;m[6]=zy;m[8]=xz;m[9]=yz;m[10]=zz;m[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);m[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);m[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);return m;}
  function compose(x,y,z,sx,sy,sz,ry=0,rx=0){return multiply(translation(x,y,z),multiply(rotationY(ry),multiply(rotationX(rx),scale(sx,sy,sz))));}

  let state=window.DontStopSave.read();let lane=clamp(Number(state.progress?.lane??DEFAULT_LANE),0,2),laneVisual=lane,selectedLevel=clamp(Number(state.selectedLevel||1),1,5);
  let score=0,runCoins=0,dodged=0,elapsed=0,running=false,gameOver=false,raf=0,lastFrame=0,spawnTimer=0,checkpointTimer=0;
  let objects=[];let touchStartX=0,touchStartY=0,jumpY=0,jumpVelocity=0,roadOffset=0,sceneryOffset=0;
  const levelConfig=()=>LEVELS[selectedLevel]||LEVELS[1];
  function updateHud(){scoreEl.textContent=format(score);bestEl.textContent=format(state.bestScore||0);coinsEl.textContent=format((state.coins||0)+runCoins);levelEl.textContent=`${selectedLevel} • ${levelConfig().name}`;}
  function setSaveStatus(text){savePill.textContent=text;}
  function safeSave(data){try{return Boolean(window.DontStopSave.set(data));}catch{return false;}}
  function saveActiveRun(){if(!running||gameOver)return true;const activeRun={score:Math.floor(score),elapsed,runCoins,dodged,lane,selectedLevel};const ok=safeSave({selectedLevel,progress:{...(state.progress||{}),lane,activeRun}});state=window.DontStopSave.read();setSaveStatus(ok?'GESPEICHERT':'SAVE FEHLER');return ok;}
  function clearObjects(){objects.length=0;}
  function endRun(){if(!running)return;running=false;gameOver=true;cancelAnimationFrame(raf);const previousBest=Number(state.bestScore||0),finalScore=Math.floor(score),stats=state.statistics||{};const ok=safeSave({bestScore:Math.max(previousBest,finalScore),bestTime:Math.max(Number(state.bestTime||0),elapsed),bestCombo:Math.max(Number(state.bestCombo||0),dodged),coins:Number(state.coins||0)+runCoins,selectedLevel,statistics:{...stats,totalRuns:Number(stats.totalRuns||0),totalTime:Number(stats.totalTime||0)+elapsed,totalDodges:Number(stats.totalDodges||0)+dodged},progress:{...(state.progress||{}),lane,activeRun:null}});state=window.DontStopSave.read();setSaveStatus(ok?'GESPEICHERT':'SAVE FEHLER');clearObjects();overlay.classList.remove('hidden');startBtn.hidden=false;resumeBtn.hidden=true;startBtn.textContent='NOCHMAL';overlayText.innerHTML=`${finalScore>previousBest?'<strong>🏆 NEUER REKORD!</strong><br>':''}Level ${selectedLevel} • ${levelConfig().name}<br>Score: <strong>${format(finalScore)}</strong><br>Ausgewichen: <strong>${format(dodged)}</strong><br>Coins: <strong>+${format(runCoins)}</strong>`;updateHud();render(performance.now());}
  function addObject(type,laneIndex,z,extra={}){objects.push({type,lane:clamp(Math.round(laneIndex),0,2),z,hit:false,scored:false,spin:Math.random()*Math.PI*2,...extra});}
  function spawnPattern(){const cfg=levelConfig(),safeLane=Math.floor(Math.random()*3),canDouble=elapsed>=cfg.doubleAfter&&Math.random()<cfg.doubleChance;if(canDouble){for(let i=0;i<3;i++)if(i!==safeLane)addObject('obstacle',i,-75,{height:1.65});}else addObject('obstacle',(safeLane+1)%3,-75,{height:1.55});if(Math.random()<0.65)addObject('coin',safeLane,-67,{y:1.55});}
  function currentSpeed(){const cfg=levelConfig();return cfg.speed+elapsed*cfg.ramp;}
  function requestMove(delta){if(!running)return;lane=clamp(lane+delta,0,2);safeSave({progress:{...(state.progress||{}),lane}});}
  function jump(){if(!running||jumpY>0.08)return;jumpVelocity=7.9;jumpY=0.03;}
  function obstacleCollision(obj){if(obj.lane!==lane)return false;const longitudinal=Math.abs(obj.z-PLAYER_Z)<0.95;const clearJump=jumpY>Math.max(1.2,(obj.height||1.55)-0.18);return longitudinal&&!clearJump;}
  function collectCoin(obj){if(obj.lane!==lane)return false;return Math.abs(obj.z-PLAYER_Z)<0.95&&Math.abs((obj.y||1.5)-(jumpY+0.85))<1.15;}
  function startRun(resume=false){cancelAnimationFrame(raf);clearObjects();gameOver=false;running=true;overlay.classList.add('hidden');const active=state.progress?.activeRun;if(resume&&active){selectedLevel=clamp(Number(active.selectedLevel||state.selectedLevel||1),1,5);lane=clamp(Number(active.lane??DEFAULT_LANE),0,2);laneVisual=lane;score=Math.max(0,Number(active.score||0));elapsed=Math.max(0,Number(active.elapsed||0));runCoins=Math.max(0,Number(active.runCoins||0));dodged=Math.max(0,Number(active.dodged||0));}else{selectedLevel=clamp(Number(state.selectedLevel||1),1,5);lane=DEFAULT_LANE;laneVisual=lane;score=0;elapsed=0;runCoins=0;dodged=0;const stats=state.statistics||{};safeSave({selectedLevel,statistics:{...stats,totalRuns:Number(stats.totalRuns||0)+1},progress:{...(state.progress||{}),lane,activeRun:{score:0,elapsed:0,runCoins:0,dodged:0,lane,selectedLevel}}});state=window.DontStopSave.read();}jumpY=0;jumpVelocity=0;spawnTimer=resume?0.7:1.0;checkpointTimer=0;roadOffset=0;sceneryOffset=0;lastFrame=performance.now();updateHud();setSaveStatus('GESPEICHERT');render(performance.now());raf=requestAnimationFrame(loop);}
  function pauseRun(){if(!running)return;saveActiveRun();running=false;cancelAnimationFrame(raf);overlay.classList.remove('hidden');startBtn.hidden=true;resumeBtn.hidden=false;overlayText.textContent='Dein Run wurde gespeichert. Du kannst ihn fortsetzen.';}
  function saveOnClose(){if(running&&!gameOver)saveActiveRun();else{try{window.DontStopSave.saveImmediately();}catch{}}}
  function detectResume(){const active=state.progress?.activeRun;if(active&&Number(active.elapsed)>0){resumeBtn.hidden=false;overlayText.textContent=`Gespeicherter Run: Level ${active.selectedLevel||1} • ${Number(active.elapsed).toFixed(1)} s • ${format(active.runCoins||0)} Coins.`;}}
  function resize(){const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.floor(innerWidth*dpr)),h=Math.max(1,Math.floor(innerHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);}
  function drawCube(model,color){gl.uniformMatrix4fv(locations.model,false,model);gl.uniform3fv(locations.color,color);gl.drawElements(gl.TRIANGLES,cubeIndices.length,gl.UNSIGNED_SHORT,0);}
  function render(now){const t=Number(now||performance.now())/1000;resize();gl.clearColor(0.025,0.035,0.075,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const aspect=canvas.width/Math.max(1,canvas.height),proj=perspective(Math.PI/3.2,aspect,0.1,140),camX=LANES[1]+(LANES[Math.round(laneVisual)]-LANES[1])*0.12,view=lookAt([camX,4.3,8.6],[0,0.9,-18],[0,1,0]);gl.uniformMatrix4fv(locations.view,false,view);gl.uniformMatrix4fv(locations.projection,false,proj);
    for(let i=-1;i<30;i++){const z=8-i*5-(roadOffset%5);drawCube(compose(0,-0.2,z,8,0.4,5),[0.055,0.07,0.13]);drawCube(compose(-1.18,-0.18,z,0.07,0.05,4),[0.28,0.30,0.42]);drawCube(compose(1.18,-0.18,z,0.07,0.05,4),[0.28,0.30,0.42]);}
    for(let i=0;i<22;i++){const z=8-i*7-(sceneryOffset%7),h=2.8+(i%3)*0.7,side=i%2===0?-1:1;drawCube(compose(side*4.5,h/2-0.1,z,0.32,h,0.32),[0.14,0.17,0.30]);drawCube(compose(side*6.7,1.0,z+2.4,2,2,2+(i%2)),[0.08,0.11,0.21]);}
    const px=LANES[Math.round(laneVisual)],py=0.62+jumpY,bob=running?Math.sin(t*10)*0.035:0;drawCube(compose(px,py+bob,PLAYER_Z,1.05,1.05,0.85),[0.40,0.30,0.95]);drawCube(compose(px,py+1.05+bob,PLAYER_Z,0.62,0.62,0.62),[0.16,0.90,0.72]);drawCube(compose(px,py+0.12+bob,PLAYER_Z,1.25,0.18,0.95),[0.70,0.64,1.0]);
    for(const obj of objects){if(obj.type==='obstacle'){const h=obj.height||1.55,wobble=Math.sin(t*5+obj.spin)*0.05;drawCube(compose(LANES[obj.lane],h/2,obj.z,1.65,h,1.0,wobble),[0.96,0.17,0.33]);drawCube(compose(LANES[obj.lane],h+0.20,obj.z,0.95,0.14,0.35,wobble),[1.0,0.42,0.20]);}else{obj.spin+=0.04;drawCube(compose(LANES[obj.lane],obj.y||1.45,obj.z,0.48,0.48,0.16,obj.spin),[1.0,0.82,0.16]);}}
  }
  function loop(now){if(!running)return;const dt=Math.min(0.045,Math.max(0,(now-lastFrame)/1000));lastFrame=now;elapsed+=dt;const speed=currentSpeed();laneVisual+=(lane-laneVisual)*Math.min(1,dt*18);jumpVelocity-=18*dt;jumpY+=jumpVelocity*dt;if(jumpY<=0){jumpY=0;jumpVelocity=0;}score+=dt*(95+selectedLevel*24+elapsed*(3.5+selectedLevel));spawnTimer-=dt;checkpointTimer-=dt;roadOffset+=speed*dt;sceneryOffset+=speed*dt;if(spawnTimer<=0){spawnPattern();spawnTimer=Math.max(0.50,levelConfig().spawn-elapsed*0.0045);}for(const obj of objects){obj.z+=speed*dt;if(obj.type==='obstacle'){if(!obj.hit&&obstacleCollision(obj)){endRun();return;}if(!obj.scored&&obj.z>PLAYER_Z+1.35){obj.scored=true;dodged+=1;runCoins+=1;}}else if(!obj.hit&&collectCoin(obj)){obj.hit=true;runCoins+=1;}}objects=objects.filter(obj=>obj.z<12&&!obj.hit);updateHud();if(checkpointTimer<=0){saveActiveRun();checkpointTimer=0.8;}render(now);raf=requestAnimationFrame(loop);}

  startBtn.addEventListener('click',()=>startRun(false));resumeBtn.addEventListener('click',()=>startRun(true));leftBtn.addEventListener('click',()=>requestMove(-1));rightBtn.addEventListener('click',()=>requestMove(1));jumpBtn.addEventListener('click',jump);
  window.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(event.key==='ArrowLeft'||key==='a'){event.preventDefault();requestMove(-1);}else if(event.key==='ArrowRight'||key==='d'){event.preventDefault();requestMove(1);}else if(event.key==='ArrowUp'||key==='w'||event.code==='Space'){event.preventDefault();jump();}else if(event.key==='Escape'&&running)pauseRun();});
  canvas.addEventListener('touchstart',e=>{const touch=e.changedTouches[0];if(!touch)return;touchStartX=touch.clientX;touchStartY=touch.clientY;},{passive:true});
  canvas.addEventListener('touchend',e=>{const touch=e.changedTouches[0];if(!touch)return;const dx=touch.clientX-touchStartX,dy=touch.clientY-touchStartY;if(Math.max(Math.abs(dx),Math.abs(dy))<28)return;if(Math.abs(dx)>Math.abs(dy))requestMove(dx>0?1:-1);else if(dy<0)jump();},{passive:true});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(raf);running=false;overlay.classList.remove('hidden');startBtn.hidden=false;resumeBtn.hidden=false;overlayText.textContent='Die 3D-Grafik wurde unterbrochen. Dein Run wurde gespeichert. Drücke PLAY oder RUN FORTSETZEN.';saveActiveRun();},false);
  canvas.addEventListener('webglcontextrestored',()=>{location.reload();},false);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveOnClose();});window.addEventListener('pagehide',saveOnClose);window.addEventListener('beforeunload',saveOnClose);window.addEventListener('resize',resize,{passive:true});
  state=window.DontStopSave.read();lane=clamp(Number(state.progress?.lane??DEFAULT_LANE),0,2);laneVisual=lane;selectedLevel=clamp(Number(state.selectedLevel||1),1,5);resize();updateHud();detectResume();render(performance.now());
})();