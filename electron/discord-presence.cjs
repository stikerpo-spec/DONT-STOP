const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = path.join(__dirname, '..', 'discord-config.json');
const PIPE = i => `\\\\?\\pipe\\discord-ipc-${i}`;

function readConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return {
      clientId: String(c.clientId || '').trim(),
      largeImage: String(c.largeImage || 'dontstop_logo').trim(),
      largeText: String(c.largeText || "DON'T STOP").trim()
    };
  } catch {
    return { clientId: '', largeImage: 'dontstop_logo', largeText: "DON'T STOP" };
  }
}

function packet(op, data) {
  const body = Buffer.from(JSON.stringify(data), 'utf8');
  const out = Buffer.alloc(body.length + 8);
  out.writeInt32LE(op, 0);
  out.writeInt32LE(body.length, 4);
  body.copy(out, 8);
  return out;
}

class Presence {
  constructor() {
    this.config = readConfig();
    this.socket = null;
    this.connected = false;
    this.nonce = 0;
  }

  enabled() {
    return /^\d{8,22}$/.test(this.config.clientId);
  }

  connect() {
    if (!this.enabled() || this.connected) return Promise.resolve(this.connected);
    return new Promise(resolve => {
      let done = false;
      const finish = ok => {
        if (!done) {
          done = true;
          resolve(ok);
        }
      };

      const tryPipe = i => {
        if (i > 9) return finish(false);
        const socket = net.createConnection(PIPE(i));
        let finished = false;
        const timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          socket.destroy();
          tryPipe(i + 1);
        }, 1200);

        socket.once('connect', () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          this.socket = socket;
          this.connected = true;
          socket.on('close', () => this.disconnect());
          socket.on('error', () => this.disconnect());
          this.send(0, { v: 1, client_id: this.config.clientId });
          finish(true);
        });

        socket.once('error', () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          socket.destroy();
          tryPipe(i + 1);
        });
      };

      tryPipe(0);
    });
  }

  send(op, data) {
    if (!this.connected || !this.socket) return false;
    try {
      this.nonce += 1;
      this.socket.write(packet(op, { ...data, nonce: `dont-stop-${this.nonce}` }));
      return true;
    } catch {
      this.disconnect();
      return false;
    }
  }

  async update({ details = "DON'T STOP", state = 'Spielt gerade', startedAt = Math.floor(Date.now() / 1000) } = {}) {
    if (!(await this.connect())) return false;
    return this.send(1, {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: {
          type: 0,
          details: String(details),
          state: String(state),
          timestamps: { start: Number(startedAt) },
          assets: {
            large_image: this.config.largeImage,
            large_text: this.config.largeText
          },
          instance: true
        }
      }
    });
  }

  clear() {
    if (this.connected) {
      this.send(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null } });
    }
  }

  disconnect() {
    try { this.socket?.destroy(); } catch {}
    this.socket = null;
    this.connected = false;
  }
}

module.exports = new Presence();
