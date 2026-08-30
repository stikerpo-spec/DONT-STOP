(() => {
  'use strict';
  const BASE_KEY='dont-stop-save-v2', LEGACY_KEYS=['dont-stop-save-v1'];
  const defaults={version:2,playerName:'Player',level:1,unlockedLevels:[1],selectedLevel:1,xp:0,coins:0,gems:0,bestScore:0,bestTime:0,bestCombo:0,inventory:[],equipped:{},achievements:[],missions:{},missionClaimed:{},upgrades:{},ownedCharacters:['starter'],ownedTrails:['none'],progression:{world:'city',prestige:0,dailyStreak:0,dailyClaimedAt:'',highestLevel:1,character:'starter',trail:'none'},season:{},settings:{music:true,sfx:true,haptics:true,graphics:'high',language:'de'},progress:{},updatedAt:Date.now()};
  const activeUser=()=>{try{return(localStorage.getItem('dontStopSessionV1')||'').trim()||'guest'}catch{return'guest'}};
  const storageKey=(u=activeUser())=>`${BASE_KEY}:${String(u||'guest').trim().toLowerCase().replace(/[^a-z0-9_-]/gi,'_').slice(0,40)||'guest'}`;
  const clone=v=>JSON.parse(JSON.stringify(v));
  function merge(t,s){for(const k of Object.keys(s||{})){const v=s[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&t[k]&&typeof t[k]==='object'&&!Array.isArray(t[k]))merge(t[k],v);else t[k]=v}return t}
  function normalize(s){s.unlockedLevels=Array.from(new Set([1,...(s.unlockedLevels||[])].map(Number))).filter(Number.isFinite).sort((a,b)=>a-b);s.selectedLevel=Math.max(1,Math.min(150,Number(s.selectedLevel)||1));s.coins=Math.max(0,Number(s.coins)||0);s.gems=Math.max(0,Number(s.gems)||0);s.bestScore=Math.max(0,Number(s.bestScore)||0);s.bestTime=Math.max(0,Number(s.bestTime)||0);s.bestCombo=Math.max(0,Number(s.bestCombo)||0);s.progression=merge(clone(defaults.progression),s.progression||{});s.progression.highestLevel=Math.max(1,Number(s.progression.highestLevel)||1,...s.unlockedLevels);s.progression.prestige=Math.max(0,Number(s.progression.prestige)||0);s.upgrades={...(s.upgrades||{})};s.ownedCharacters=Array.from(new Set(['starter',...(s.ownedCharacters||[])]));s.ownedTrails=Array.from(new Set(['none',...(s.ownedTrails||[])]));return s}
  function read(u=activeUser()){try{let raw=localStorage.getItem(storageKey(u));if(!raw&&u==='guest')raw=localStorage.getItem(BASE_KEY)||localStorage.getItem(LEGACY_KEYS[0]);return raw?normalize(merge(clone(defaults),JSON.parse(raw))):clone(defaults)}catch{return clone(defaults)}}
  function write(data,u=activeUser()){try{const safe=normalize(merge(clone(defaults),data||{}));safe.updatedAt=Date.now();localStorage.setItem(storageKey(u),JSON.stringify(safe));window.dispatchEvent(new CustomEvent('dontstop:saved',{detail:safe}));return true}catch{return false}}
  function set(p,u=activeUser()){return write(merge(read(u),p||{}),u)}
  function clear(u=activeUser()){try{localStorage.removeItem(storageKey(u));return true}catch{return false}}
  function hasSave(u=activeUser()){try{return Boolean(localStorage.getItem(storageKey(u))||(u==='guest'&&(localStorage.getItem(BASE_KEY)||localStorage.getItem(LEGACY_KEYS[0]))))}catch{return false}}
  function migrateGuestTo(u){try{if(!u||u==='guest')return false;const key=storageKey(u);if(localStorage.getItem(key))return true;const raw=localStorage.getItem(storageKey('guest'))||localStorage.getItem(BASE_KEY)||localStorage.getItem(LEGACY_KEYS[0]);if(!raw)return true;const s=normalize(merge(clone(defaults),JSON.parse(raw)));s.playerName=u;localStorage.setItem(key,JSON.stringify(s));return true}catch{return false}}
  function saveImmediately(){write(read())}
  window.DontStopSave={read,write,set,clear,hasSave,saveImmediately,migrateGuestTo};
  window.addEventListener('pagehide',saveImmediately,{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveImmediately()});
  window.addEventListener('beforeunload',saveImmediately);
})();
