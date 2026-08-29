(() => {
  'use strict';

  const USERS_KEY = 'dontStopUsersV1';
  const SESSION_KEY = 'dontStopSessionV1';

  const readUsers = () => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeUsers = users => {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); return true; } catch { return false; }
  };

  const readSession = () => {
    try { return localStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
  };

  const writeSession = username => {
    try {
      if (username) localStorage.setItem(SESSION_KEY, username);
      else localStorage.removeItem(SESSION_KEY);
      return true;
    } catch {
      return false;
    }
  };

  async function hashPassword(password) {
    if (!globalThis.crypto?.subtle) return `fallback:${btoa(unescape(encodeURIComponent(password)))}`;
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }

  const cleanUsername = value => String(value || '').trim().replace(/\s+/g, ' ');
  const validUsername = name => /^[\p{L}\p{N}_ -]{3,20}$/u.test(name);

  function getCurrentUser() {
    const username = readSession();
    if (!username) return null;
    const users = readUsers();
    return users[username] || null;
  }

  function ensureBaseUi() {
    if (document.getElementById('accountPanel')) return;
    const section = document.createElement('section');
    section.id = 'accountPanel';
    section.className = 'account-panel';
    section.innerHTML = `
      <div class="account-head">
        <div><div class="account-eyebrow">SPIELERPROFIL</div><h2 id="accountTitle">Anmelden</h2><p id="accountSub">Sichere dein Profil auf diesem Gerät.</p></div>
        <div id="accountBadge" class="account-badge">Gast</div>
      </div>
      <div id="accountContent"></div>
    `;
    const anchor = document.querySelector('.app-only');
    if (anchor) anchor.insertBefore(section, anchor.firstChild);
  }

  function showForm(mode = 'login') {
    ensureBaseUi();
    const title = document.getElementById('accountTitle');
    const sub = document.getElementById('accountSub');
    const badge = document.getElementById('accountBadge');
    const content = document.getElementById('accountContent');
    if (!title || !sub || !badge || !content) return;

    const current = getCurrentUser();
    if (current) {
      title.textContent = `Hallo, ${current.username}`;
      sub.textContent = 'Dein Profil ist auf diesem Gerät angemeldet.';
      badge.textContent = 'ANGEMELDET';
      content.innerHTML = `<div class="account-actions"><button id="logoutBtn" class="account-btn">ABMELDEN</button></div>`;
      document.getElementById('logoutBtn')?.addEventListener('click', () => {
        writeSession('');
        render();
      });
      return;
    }

    badge.textContent = mode === 'register' ? 'NEUES PROFIL' : 'GAST';
    title.textContent = mode === 'register' ? 'Registrieren' : 'Anmelden';
    sub.textContent = mode === 'register' ? 'Erstelle dein Spielerprofil auf diesem Gerät.' : 'Melde dich mit deinem Spielerprofil an.';
    content.innerHTML = `
      <form id="accountForm" class="account-form">
        ${mode === 'register' ? '<label>Spielername<input id="accountUsername" maxlength="20" autocomplete="username" required placeholder="z. B. Stiker"></label>' : '<label>Spielername<input id="accountUsername" maxlength="20" autocomplete="username" required></label>'}
        <label>Passwort<input id="accountPassword" type="password" minlength="6" maxlength="64" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" required></label>
        ${mode === 'register' ? '<label>Passwort wiederholen<input id="accountPassword2" type="password" minlength="6" maxlength="64" autocomplete="new-password" required></label>' : ''}
        <div id="accountError" class="account-error" role="alert"></div>
        <button class="account-btn primary" type="submit">${mode === 'register' ? 'KONTO ERSTELLEN' : 'ANMELDEN'}</button>
      </form>
      <button id="switchAccountMode" class="account-link" type="button">${mode === 'register' ? 'Ich habe bereits ein Konto' : 'Noch kein Konto? Registrieren'}</button>
      <div class="account-note">Kontodaten werden aktuell nur auf diesem Gerät gespeichert. Es gibt noch keine serverweite Synchronisierung.</div>
    `;

    document.getElementById('switchAccountMode')?.addEventListener('click', () => showForm(mode === 'register' ? 'login' : 'register'));
    document.getElementById('accountForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const username = cleanUsername(document.getElementById('accountUsername')?.value);
      const password = String(document.getElementById('accountPassword')?.value || '');
      const password2 = String(document.getElementById('accountPassword2')?.value || '');
      const errorEl = document.getElementById('accountError');
      const fail = message => { if (errorEl) errorEl.textContent = message; };

      if (!validUsername(username)) return fail('Der Spielername muss 3–20 Zeichen lang sein.');
      if (password.length < 6) return fail('Das Passwort muss mindestens 6 Zeichen haben.');

      const users = readUsers();
      if (mode === 'register') {
        if (users[username]) return fail('Dieser Spielername ist bereits vergeben.');
        if (password !== password2) return fail('Die Passwörter stimmen nicht überein.');
        const passwordHash = await hashPassword(password);
        users[username] = { username, passwordHash, createdAt: Date.now() };
        if (!writeUsers(users)) return fail('Das Konto konnte nicht gespeichert werden.');
        writeSession(username);
        render();
      } else {
        const user = users[username];
        if (!user) return fail('Spielername oder Passwort ist falsch.');
        const passwordHash = await hashPassword(password);
        if (user.passwordHash !== passwordHash) return fail('Spielername oder Passwort ist falsch.');
        writeSession(username);
        render();
      }
    });
  }

  function render() { showForm(getCurrentUser() ? 'login' : 'login'); }

  window.DontStopAuth = {
    getCurrentUser,
    isLoggedIn: () => Boolean(getCurrentUser()),
    logout: () => { writeSession(''); render(); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.documentElement.classList.contains('is-native-app')) return;
    ensureBaseUi();
    render();
  }, { once: true });
})();
