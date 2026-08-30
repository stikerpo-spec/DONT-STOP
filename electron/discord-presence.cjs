const { Client } = require('@xhayper/discord-rpc');
const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = path.join(__dirname, '..', 'discord-config.json');

function readConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return {
      clientId: String(c.clientId || '').trim(),
      largeImage: String(c.largeImage || '').trim(),
      largeText: String(c.largeText || "DON'T STOP").trim()
    };
  } catch {
    return { clientId: '', largeImage: '', largeText: "DON'T STOP" };
  }
}

class Presence {
  constructor() {
    this.config = readConfig();
    this.client = null;
    this.loginPromise = null;
    this.startedAt = Date.now();
  }

  enabled() {
    return /^\d{8,22}$/.test(this.config.clientId);
  }

  async connect() {
    if (!this.enabled()) return false;
    if (this.client?.user) return true;
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = new Promise(resolve => {
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      try {
        const client = new Client({ clientId: this.config.clientId });
        this.client = client;
        client.once('ready', () => finish(true));
        client.once('error', () => finish(false));
        Promise.resolve(client.login()).catch(() => finish(false));
        setTimeout(() => finish(Boolean(client.user)), 6000);
      } catch {
        finish(false);
      }
    });

    const ok = await this.loginPromise;
    this.loginPromise = null;
    if (!ok) {
      try { this.client?.destroy?.(); } catch {}
      this.client = null;
    }
    return ok;
  }

  async update({ details = "DON'T STOP", state = 'Spielt gerade', startedAt } = {}) {
    if (!(await this.connect())) return false;
    try {
      const activity = {
        details: String(details),
        state: String(state),
        startTimestamp: Number.isFinite(Number(startedAt)) && Number(startedAt) > 0
          ? Number(startedAt) * 1000
          : this.startedAt,
        largeImageKey: this.config.largeImage || undefined,
        largeImageText: this.config.largeText || "DON'T STOP",
        instance: true
      };
      this.client.user.setActivity(activity);
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try { this.client?.user?.clearActivity?.(); } catch {}
  }

  disconnect() {
    try { this.client?.destroy?.(); } catch {}
    this.client = null;
    this.loginPromise = null;
  }
}

module.exports = new Presence();
