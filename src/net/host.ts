import Peer, { type DataConnection } from 'peerjs';
import { BOT_NAMES, botDiscard, botFinal, randomPersonality, type BotPersonality } from '../engine/bots';
import { applyAction, peerIdFor, type Action, type Connection, type MatchClient } from '../engine/client';
import { GameHost } from '../engine/game';
import { mulberry32, pick, shuffle } from '../engine/rng';
import type { GameView } from '../engine/types';
import type { GuestMessage, HostMessage } from './protocol';

/** Reveal time must match the draw animation in the UI. */
export const TIMING = {
  normal: { reveal: 1500, think: [900, 2600] as const },
  fast: { reveal: 750, think: [300, 900] as const },
};

const BOT_LINES = {
  draw: ['Hmm...', 'Wehhh!', 'Alamak...', 'Nice!'],
  win: ['Wahh!', 'Nice!', 'KAW-KAW!'],
  lose: ['Alamak...', 'Adoi!', 'Hmm...'],
};

export const AVATARS = Array.from({ length: 12 }, (_, i) => `avatar-${String(i + 1).padStart(2, '0')}`);

/**
 * Runs on the host's device: owns the GameHost (the secret draw order and
 * every hand), plays the bots, and serves each online guest only their own
 * view. Guests never receive the sequence or other players' cards.
 */
export class HostMatch implements MatchClient {
  readonly host: GameHost;
  readonly me: string;
  readonly isHostDevice = true;
  connection: Connection = 'local';
  connectionNote = '';
  private fast = false;
  private autoDraw = false;
  private rng = mulberry32(Date.now() ^ 0x9e3779b9);
  /** Bots, plus online players who dropped out mid-game (auto-played until they return). */
  private bots = new Map<string, BotPersonality>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private scheduled = new Set<string>();
  private cached: GameView | null = null;
  private lastDrawAt = 0;
  private listeners = new Set<() => void>();
  private peer: Peer | null = null;
  private conns = new Map<string, DataConnection>(); // playerId → connection
  private disposed = false;

  constructor(me: string, name: string, avatar: string, online: boolean) {
    this.me = me;
    this.host = new GameHost();
    this.host.onAnalytics = (e) => {
      if (import.meta.env?.DEV) console.debug('[analytics]', e.name, e.data ?? '');
    };
    this.host.addPlayer({ id: me, name, avatar, isBot: false });
    this.host.subscribe(() => {
      this.cached = null;
      this.broadcast();
      this.tick();
      this.emit();
    });
    if (online) this.openRoom();
  }

  // ── MatchClient ─────────────────────────────────────────────
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private emit() {
    this.listeners.forEach((fn) => fn());
  }
  getView = (): GameView => (this.cached ??= this.host.view(this.me));

  act(a: Action) {
    this.handle(this.me, a);
  }

  setSpeed(fast: boolean) {
    this.fast = fast;
  }
  setAutoDraw(on: boolean) {
    this.autoDraw = on;
    this.tick();
  }

  dispose() {
    this.disposed = true;
    this.timers.forEach(clearTimeout);
    this.conns.forEach((c) => c.close());
    this.peer?.destroy();
  }

  // ── actions from any player ─────────────────────────────────
  private handle(pid: string, a: Action) {
    const h = this.host;
    const isHost = pid === this.me;
    switch (a.type) {
      case 'draw':
        if (Date.now() - this.lastDrawAt < this.timing().reveal * 0.8) return;
        if (h.drawerId() !== pid) return;
        this.lastDrawAt = Date.now();
        h.draw(pid);
        return;
      case 'addBot':
        if (isHost) this.addBot();
        return;
      case 'remove':
        if (isHost) this.removePlayer(a.id);
        return;
      case 'config':
        if (isHost) h.setConfig(a.config);
        return;
      default:
        applyAction(h, pid, a);
    }
  }

  addBot() {
    const h = this.host;
    const usedNames = new Set(h.players.map((p) => p.name));
    const usedAvatars = new Set(h.players.map((p) => p.avatar));
    const name = shuffle(this.rng, BOT_NAMES.filter((n) => !usedNames.has(n)))[0] ?? `Bot ${h.players.length}`;
    const avatar = shuffle(this.rng, AVATARS.filter((a) => !usedAvatars.has(a)))[0] ?? AVATARS[0];
    const id = `bot-${name.toLowerCase().replace(/\s+/g, '-')}`;
    this.bots.set(id, randomPersonality(this.rng));
    h.addPlayer({ id, name, avatar, isBot: true });
  }

  private removePlayer(id: string) {
    this.bots.delete(id);
    const c = this.conns.get(id);
    if (c) {
      this.send(c, { t: 'reject', reason: 'Hos telah mengeluarkan anda dari bilik.' });
      setTimeout(() => c.close(), 300);
      this.conns.delete(id);
    }
    this.host.removePlayer(id);
  }

  // ── networking ───────────────────────────────────────────────
  private openRoom(attempt = 0) {
    this.connection = 'connecting';
    this.connectionNote = 'Membuka bilik dalam talian…';
    this.emit();
    const peer = new Peer(peerIdFor(this.host.roomCode));
    this.peer = peer;
    peer.on('open', () => {
      this.connection = 'online';
      this.connectionNote = '';
      this.cached = null;
      this.emit();
    });
    peer.on('error', (err: { type?: string }) => {
      if (this.disposed) return;
      if (err.type === 'unavailable-id' && attempt < 4) {
        peer.destroy();
        this.host.newRoomCode();
        this.openRoom(attempt + 1);
        return;
      }
      if (this.connection === 'online' && err.type === 'peer-unavailable') return;
      this.connection = 'error';
      this.connectionNote = 'Tak dapat buka bilik dalam talian. Anda masih boleh main dengan lawan komputer.';
      this.emit();
    });
    peer.on('disconnected', () => {
      if (!this.disposed) peer.reconnect();
    });
    peer.on('connection', (conn) => this.accept(conn));
  }

  private accept(conn: DataConnection) {
    let pid: string | null = null;
    conn.on('data', (raw) => {
      const msg = raw as GuestMessage;
      if (msg?.t === 'hello') {
        pid = this.join(conn, msg);
      } else if (msg?.t === 'act' && pid && this.conns.get(pid) === conn) {
        this.handle(pid, msg.action);
      }
    });
    conn.on('close', () => {
      if (pid && this.conns.get(pid) === conn) this.leave(pid);
    });
  }

  private join(conn: DataConnection, hello: Extract<GuestMessage, { t: 'hello' }>): string | null {
    const h = this.host;
    const id = String(hello.clientId).slice(0, 40);
    if (id === this.me) {
      this.send(conn, { t: 'reject', reason: 'Anda sudah menjadi hos bilik ini pada peranti ini.' });
      return null;
    }
    const existing = h.players.find((p) => p.id === id);
    if (existing) {
      // Reconnecting player: hand control back from the bot stand-in.
      this.conns.get(id)?.close();
      this.conns.set(id, conn);
      this.bots.delete(id);
      h.setConnected(id, true);
    } else {
      if (h.phase !== 'LOBBY') {
        this.send(conn, { t: 'reject', reason: 'Permainan sudah bermula. Tunggu pusingan seterusnya.' });
        return null;
      }
      const name = String(hello.name || 'Pemain').slice(0, 14);
      const avatar = AVATARS.includes(hello.avatar) ? hello.avatar : AVATARS[0];
      if (!h.addPlayer({ id, name, avatar, isBot: false, connected: true })) {
        this.send(conn, { t: 'reject', reason: 'Bilik sudah penuh (maksimum 6 pemain).' });
        return null;
      }
      this.conns.set(id, conn);
    }
    this.send(conn, { t: 'view', view: h.view(id) });
    return id;
  }

  private leave(pid: string) {
    this.conns.delete(pid);
    const h = this.host;
    if (h.phase === 'LOBBY') {
      h.removePlayer(pid);
    } else {
      // Keep the match going: a bot plays their turns until they rejoin.
      this.bots.set(pid, randomPersonality(this.rng));
      h.setConnected(pid, false);
    }
  }

  private send(conn: DataConnection, msg: HostMessage) {
    if (conn.open) conn.send(msg);
  }

  private broadcast() {
    for (const [pid, conn] of this.conns) this.send(conn, { t: 'view', view: this.host.view(pid) });
  }

  // ── bots ─────────────────────────────────────────────────────
  private timing() {
    return TIMING[this.fast ? 'fast' : 'normal'];
  }

  private later(key: string, ms: number, fn: () => void) {
    if (this.scheduled.has(key)) return;
    this.scheduled.add(key);
    const t = setTimeout(() => {
      this.timers.delete(t);
      this.scheduled.delete(key);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(t);
  }

  /** React to a state change: schedule whatever the bots need to do next. */
  private tick() {
    const h = this.host;
    const t = this.timing();
    const v = this.getView();
    const key = `${v.round}:${v.drawIndex}:${v.phase}`;

    if (v.phase === 'DRAW_PHASE' && v.drawerId) {
      const drawer = v.drawerId;
      if (this.bots.has(drawer) || (drawer === this.me && this.autoDraw)) {
        const since = Date.now() - this.lastDrawAt;
        const wait = Math.max(t.reveal + 200 - since, 350) + this.rng() * 350;
        this.later(`draw:${key}`, wait, () => {
          if (h.drawerId() !== drawer) return;
          this.lastDrawAt = Date.now();
          h.draw(drawer);
          const p = h.players.find((x) => x.id === drawer);
          if (p?.isBot && this.rng() < 0.1) h.react(drawer, pick(this.rng, BOT_LINES.draw));
        });
      }
    }

    if (v.phase === 'DECISION_PHASE' || v.phase === 'FINAL_PREDICTION') {
      for (const id of this.bots.keys()) {
        if (v.status[id] !== 'thinking') continue;
        this.later(`decide:${key}:${id}`, t.reveal + this.thinkMs(), () => {
          const view = h.view(id);
          const me = this.bots.get(id);
          if (view.status[id] !== 'thinking' || !me) return;
          if (view.phase === 'DECISION_PHASE') {
            h.discard(id, botDiscard(this.rng, view, me));
          } else {
            const { keep, kawkaw } = botFinal(this.rng, view, me);
            h.submitFinal(id, keep, kawkaw);
          }
        });
      }
    }

    if (v.phase === 'ROUND_RESOLUTION') {
      this.later(`react:${v.round}`, 1800, () => {
        const events = h.view(this.me).lastRoundEvents;
        for (const p of h.players) {
          if (!p.isBot) continue;
          const delta = events.filter((e) => e.playerId === p.id).reduce((s, e) => s + e.delta, 0);
          if (this.rng() < 0.55) h.react(p.id, pick(this.rng, delta >= 0 ? BOT_LINES.win : BOT_LINES.lose));
        }
      });
    }
  }

  private thinkMs() {
    const [lo, hi] = this.timing().think;
    return lo + this.rng() * (hi - lo);
  }
}
