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
      largeImage: String(c.largeImage || '').trim(),
      largeText: String(c.largeText || "DON'T STOP").trim()
    };
  } catch {
    return { clientId: '', largeImage: '', largeText: "DON'T STOP" };
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

function parseFrames(buffer) {
  const frames = [];
  let rest = buffer;
  while (rest.length >= 8) {
    const op = rest.readInt32LE(0);
    const length = rest.readInt32LE(4);
    if (length < 0 || length > 1024 * 1024 || rest.length < 8 + length) break;
    const json = rest.subarray(8, 8 + length).toString('utf8');
    try { frames.push({ op, data: JSON.parse(json) }); } catch {}
    rest = rest.subarray(8 + length);
  }
  return { frames, rest };
}

class Presence {
  constructor() {
    this.config = readConfig();
    this.socket = null;
    this.connected = false;
    this.ready = false;
    this.buffer = Buffer.alloc(0);
    this.nonce = 0;
    this.readyWaiters = [];
  }

  enabled() {
    return /^\d{8,22}$/.test(this.config.clientId);
  }

  waitForReady(timeoutMs = 3500) {
    if (this.ready) return Promise.resolve(true);
    return new Promise(resolve => {
      const waiter = { resolve, timer: setTimeout(() => {
        const index = this.readyWaiters.indexOf(waiter);
        if (index >= 0) this.readyWaiters.splice(index, 1);
        resolve(false);
      }, timeoutMs) };
      this.readyWaiters.push(waiter);
    });
  }

  resolveReady(value) {
    const waiters = this.readyWaiters.splice(0);
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(value);
    }
  }

  disconnect() {
    try { this.socket?.destroy(); } catch {}
    this.socket = null;
    this.connected = false;
    this.ready = false;
    this.buffer = Buffer.alloc(0);
    this.resolveReady(false);
  }

  onData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    const parsed = parseFrames(this.buffer);
    this.buffer = parsed.rest;
    for (const frame of parsed.frames) {
      if (frame.op !== 1) continue;
      const evt = frame.data?.evt;
      if (evt === 'READY') {
        this.ready = true;
        this.resolveReady(true);
      } else if (evt === 'ERROR') {
        this.resolveReady(false);
      }
    }
  }

  connect() {
    if (!this.enabled()) return Promise.resolve(false);
    if (this.ready && this.connected) return Promise.resolve(true);
    if (this.connected) return this.waitForReady();

    return new Promise(resolve => {
      let completed = false;
      const finish = ok => {
        if (completed) return;
        completed = true;
        resolve(ok);
      };

      const tryPipe = i => {
        if (i > 9) return finish(false);
        const socket = net.createConnection(PIPE(i));
        let pipeDone = false;
        const timer = setTimeout(() => {
          if (pipeDone) return;
          pipeDone = true;
          socket.destroy();
          tryPipe(i + 1);
        }, 1200);

        socket.once('connect', async () => {
          if (pipeDone) return;
          pipeDone = true;
          clearTimeout(timer);
          this.socket = socket;
          this.connected = true;
          this.ready = false;
          this.buffer = Buffer.alloc(0);
          socket.on('data', data => this.onData(data));
          socket.on('close', () => this.disconnect());
          socket.on('error', () => this.disconnect());

          // Discord RPC handshake: only version + client_id.
          try {
            socket.write(packet(0, { v: 1, client_id: this.config.clientId }));
          } catch {
            this.disconnect();
            return finish(false);
          }

          finish(await this.waitForReady());
        });

        socket.once('error', () => {
          if (pipeDone) return;
          pipeDone = true;
          clearTimeout(timer);
          socket.destroy();
          tryPipe(i + 1);
        });
      };

      tryPipe(0);
    });
  }

  sendCommand(command) {
    if (!this.ready || !this.socket) return false;
    try {
      this.nonce += 1;
      this.socket.write(packet(1, {
        ...command,
        nonce: `dont-stop-${this.nonce}`
      }));
      return true;
    } catch {
      this.disconnect();
      return false;
    }
  }

  async update({ details = "DON'T STOP", state = 'Spielt gerade', startedAt = Math.floor(Date.now() / 1000) } = {}) {
    if (!(await this.connect())) return false;

    const activity = {
      type: 0,
      details: String(details),
      state: String(state),
      timestamps: { start: Number(startedAt) },
      instance: true
    };

    if (this.config.largeImage) {
      activity.assets = {
        large_image: this.config.largeImage,
        large_text: this.config.largeText || "DON'T STOP"
      };
    }

    return this.sendCommand({
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity
      }
    });
  }

  clear() {
    if (this.ready && this.socket) {
      this.sendCommand({
        cmd: 'SET_ACTIVITY',
        args: { pid: process.pid, activity: null }
      });
    }
  }
}

module.exports = new Presence();
