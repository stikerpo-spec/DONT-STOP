(() => {
  'use strict';
  const RAW='https://raw.githubusercontent.com/stikerpo-spec/DONT-STOP/main/build-info.js';
  const WINDOWS='https://github.com/stikerpo-spec/DONT-STOP/releases/download/windows-latest/DONT-STOP-Setup.exe';
  const ANDROID='https://github.com/stikerpo-spec/DONT-STOP/releases/download/android-latest/DONT-STOP.apk';
  const isNative=()=>!location.hostname.endsWith('.github.io')&&(location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'||/Capacitor/i.test(navigator.userAgent));
  const local=()=>{const b=window.DontStopBuild||{};return {version:String(b.version||'0.0.0'),run:Number(b.run||0)}};
  const remote=t=>{const v=t.match(/version:\s*['\"]([^'\"]+)['\"]/);const r=t.match(/run:\s*(\d+)/);return {version:v?v[1]:'0.0.0',run:r?Number(r[1]):0}};
  function newer(a,b){if(a.run&&b.run)return a.run>b.run;const x=a.version.split('.').map(Number),y=b.version.split('.').map(Number);for(let i=0;i<3;i++)if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0);return false}
  function button(remoteBuild){if(document.getElementById('dsUpdateButton'))return;const b=document.createElement('button');b.id='dsUpdateButton';b.type='button';b.textContent=`UPDATE ${remoteBuild.version}`;Object.assign(b.style,{position:'fixed',right:'14px',top:'14px',zIndex:'1000',minHeight:'42px',padding:'0 14px',border:'0',borderRadius:'12px',background:'linear-gradient(135deg,#735cff,#a24dff)',color:'#fff',font:'800 12px system-ui',cursor:'pointer',touchAction:'manipulation'});b.onclick=async()=>{b.disabled=true;b.textContent='UPDATE LÄDT…';const android=/Android|Capacitor/i.test(navigator.userAgent);const url=android?ANDROID:WINDOWS;try{if(android&&window.Capacitor?.Plugins?.DontStopUpdater){await window.Capacitor.Plugins.DontStopUpdater.downloadAndInstall({url,fileName:'DONT-STOP.apk'});}else if(!android&&window.DontStopElectronUpdater){await window.DontStopElectronUpdater.downloadAndInstall(url);}else{location.href=url;}}catch(e){console.error(e);b.disabled=false;b.textContent='UPDATE ERNEUT VERSUCHEN';}};document.body.appendChild(b)}
  async function check(){if(!isNative()||location.pathname.endsWith('/game.html'))return;try{const r=await fetch(`${RAW}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;const latest=remote(await r.text());if(newer(latest,local()))button(latest)}catch{}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,800),{once:true});else setTimeout(check,800);
})();
