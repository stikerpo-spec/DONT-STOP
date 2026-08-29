(() => {
  'use strict';
  const USERS_KEY='dontStopUsersV1', SESSION_KEY='dontStopSessionV1';
  const readUsers=()=>{try{const p=JSON.parse(localStorage.getItem(USERS_KEY)||'{}');return p&&typeof p==='object'?p:{}}catch{return {}}};
  const writeUsers=u=>{try{localStorage.setItem(USERS_KEY,JSON.stringify(u));return true}catch{return false}};
  const readSession=()=>{try{return localStorage.getItem(SESSION_KEY)||''}catch{return ''}};
  const writeSession=u=>{try{if(u)localStorage.setItem(SESSION_KEY,u);else localStorage.removeItem(SESSION_KEY);return true}catch{return false}};
  async function hashPassword(password){
    if(!globalThis.crypto?.subtle)return `fallback:${btoa(unescape(encodeURIComponent(password)))}`;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  const cleanUsername=v=>String(v||'').trim().replace(/\s+/g,' ');
  const validUsername=n=>/^[\p{L}\p{N}_ -]{3,20}$/u.test(n);
  function getCurrentUser(){const u=readSession();return u?readUsers()[u]||null:null;}
  function syncPlayerName(u){try{window.DontStopSave?.set({playerName:u})}catch{}}
  function ensureBaseUi(){
    if(document.getElementById('accountPanel'))return;
    const section=document.createElement('section');section.id='accountPanel';section.className='account-panel';
    section.innerHTML=`<div class="account-head"><div><div class="account-eyebrow">SPIELERPROFIL</div><h2 id="accountTitle">Anmelden</h2><p id="accountSub">Sichere dein Profil auf diesem Gerät.</p></div><div id="accountBadge" class="account-badge">Gast</div></div><div id="accountContent"></div>`;
    const anchor=document.querySelector('.app-only');if(anchor)anchor.insertBefore(section,anchor.firstChild);
  }
  function showForm(mode='login'){
    ensureBaseUi();const title=document.getElementById('accountTitle'),sub=document.getElementById('accountSub'),badge=document.getElementById('accountBadge'),content=document.getElementById('accountContent');if(!title||!sub||!badge||!content)return;
    const current=getCurrentUser();
    if(current){syncPlayerName(current.username);title.textContent=`Hallo, ${current.username}`;sub.textContent='Dein Spielerprofil ist auf diesem Gerät angemeldet.';badge.textContent='ANGEMELDET';content.innerHTML='<div class="account-actions"><button id="logoutBtn" class="account-btn">ABMELDEN</button></div>';document.getElementById('logoutBtn')?.addEventListener('click',()=>{writeSession('');render()});return;}
    badge.textContent=mode==='register'?'NEUES PROFIL':'GAST';title.textContent=mode==='register'?'Registrieren':'Anmelden';sub.textContent=mode==='register'?'Erstelle dein Spielerprofil auf diesem Gerät.':'Melde dich mit deinem Spielerprofil an.';
    content.innerHTML=`<form id="accountForm" class="account-form"><label>Spielername<input id="accountUsername" maxlength="20" autocomplete="username" required placeholder="z. B. Stiker"></label><label>Passwort<input id="accountPassword" type="password" minlength="6" maxlength="64" autocomplete="${mode==='register'?'new-password':'current-password'}" required></label>${mode==='register'?'<label>Passwort wiederholen<input id="accountPassword2" type="password" minlength="6" maxlength="64" autocomplete="new-password" required></label>':''}<div id="accountError" class="account-error" role="alert"></div><button class="account-btn primary" type="submit">${mode==='register'?'KONTO ERSTELLEN':'ANMELDEN'}</button></form><button id="switchAccountMode" class="account-link" type="button">${mode==='register'?'Ich habe bereits ein Konto':'Noch kein Konto? Registrieren'}</button><div class="account-note">Die Anmeldung funktioniert aktuell gerätegebunden. Für echte Konten auf mehreren Geräten braucht DON’T STOP später einen Backend-Dienst.</div>`;
    document.getElementById('switchAccountMode')?.addEventListener('click',()=>showForm(mode==='register'?'login':'register'));
    document.getElementById('accountForm')?.addEventListener('submit',async event=>{
      event.preventDefault();const username=cleanUsername(document.getElementById('accountUsername')?.value),password=String(document.getElementById('accountPassword')?.value||''),password2=String(document.getElementById('accountPassword2')?.value||''),errorEl=document.getElementById('accountError');const fail=m=>{if(errorEl)errorEl.textContent=m};
      if(!validUsername(username))return fail('Der Spielername muss 3–20 Zeichen lang sein.');if(password.length<6)return fail('Das Passwort muss mindestens 6 Zeichen haben.');
      const users=readUsers();
      if(mode==='register'){
        if(users[username])return fail('Dieser Spielername ist bereits vergeben.');if(password!==password2)return fail('Die Passwörter stimmen nicht überein.');
        const passwordHash=await hashPassword(password);users[username]={username,passwordHash,createdAt:Date.now()};if(!writeUsers(users)||!writeSession(username))return fail('Das Konto konnte nicht gespeichert werden.');
        window.DontStopSave?.migrateGuestTo(username);syncPlayerName(username);render();
      }else{
        const user=users[username];if(!user)return fail('Spielername oder Passwort ist falsch.');const passwordHash=await hashPassword(password);if(user.passwordHash!==passwordHash)return fail('Spielername oder Passwort ist falsch.');if(!writeSession(username))return fail('Anmeldung konnte nicht gespeichert werden.');syncPlayerName(username);render();
      }
    });
  }
  function render(){showForm('login');}
  window.DontStopAuth={getCurrentUser,isLoggedIn:()=>Boolean(getCurrentUser()),logout:()=>{writeSession('');render()}};
  document.addEventListener('DOMContentLoaded',()=>{if(!document.documentElement.classList.contains('is-native-app'))return;ensureBaseUi();render()},{once:true});
})();
