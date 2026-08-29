(() => {
  'use strict';
  // Update handling must never block gameplay or the main menu.
  // The updater exposes a manual trigger only; no automatic fullscreen overlay.
  const REPO='stikerpo-spec/DONT-STOP';
  const RELEASE_API=`https://api.github.com/repos/${REPO}/releases/tags/`;
  const DOWNLOAD_URLS={windows:`https://github.com/${REPO}/releases/download/windows-latest/DONT-STOP-Setup.exe`,android:`https://github.com/${REPO}/releases/download/android-latest/DONT-STOP.apk`};
  const isNative=location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
  if(!isNative)return;
  function platform(){if(/Android/i.test(navigator.userAgent))return'android';if(/Windows/i.test(navigator.userAgent)||location.protocol==='file:')return'windows';return'unknown'}
  function localBuild(){const b=window.DontStopBuild||{};return{version:String(b.version||'unknown'),run:Number(b.run||0)}}
  async function latest(){const p=platform();if(p==='unknown')throw new Error('Unbekannte Plattform.');const tag=p==='android'?'android-latest':'windows-latest';const r=await fetch(`${RELEASE_API}${tag}?t=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error(`GitHub Release HTTP ${r.status}`);const rel=await r.json();const assets=Array.isArray(rel.assets)?rel.assets:[];const re=p==='android'?/^DONT-STOP-v.+-build(\d+)\.apk$/i:/^DONT-STOP-Setup-v.+-build(\d+)\.exe$/i;const hits=assets.map(a=>({a,m:String(a?.name||'').match(re)})).filter(x=>x.m&&x.a?.browser_download_url).sort((a,b)=>Number(b.m[1])-Number(a.m[1]));if(!hits.length)throw new Error('Kein Installer im Release gefunden.');const x=hits[0];return{platform:p,build:Number(x.m[1]),version:String(x.a.name).match(/v(.+)-build/i)?.[1]||'unknown',url:x.a.browser_download_url,stableUrl:`${DOWNLOAD_URLS[p]}?t=${Date.now()}`}}
  async function check(){try{const l=localBuild(),n=await latest();return{available:!l.run||n.build>l.run||(l.version!=='unknown'&&n.version!==l.version),local:l,latest:n}}catch{return{available:false,error:true}}}
  window.DontStopUpdate={check,latest,downloadUrl:()=>DOWNLOAD_URLS[platform()]};
})();
