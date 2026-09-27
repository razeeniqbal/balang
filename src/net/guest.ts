import Peer, { type DataConnection } from 'peerjs';
import { peerIdFor, type Action, type Connection, type MatchClient } from '../engine/client';
import type { GameView } from '../engine/types';
import type { GuestMessage, HostMessage } from './protocol';

const RETRY_MS = 2500;
const MAX_RETRIES = 12;

/** A guest's side of an online room: renders whatever view the host sends. */
export class GuestMatch implements MatchClient {
  readonly isHostDevice = false;
  connection: Connection = 'connecting';
  connectionNote = 'Menyambung ke bilik…';
  private view: GameView | null = null;
  private listeners = new Set<() => void>();
  private peer: Peer;
  private conn: DataConnection | null = null;
  private retries = 0;
  private rejected = false;
  private disposed = false;

  constructor(
    readonly me: string,
    readonly roomCode: string,
    private name: string,
    private avatar: string,
  ) {
    this.peer = new Peer();
    this.peer.on('open', () => this.connect());
    this.peer.on('error', (err: { type?: string }) => {
      if (this.disposed) return;
      if (err.type === 'peer-unavailable') {
        this.fail(this.view ? 'Hos terputus. Cuba sambung semula…' : 'Bilik tidak dijumpai. Semak kod bilik.', !!this.view);
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.fail('Masalah rangkaian. Cuba sambung semula…', true);
      }
    });
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getView = () => this.view;

  act(a: Action) {
    if (this.conn?.open) this.conn.send({ t: 'act', action: a } satisfies GuestMessage);
  }

  setSpeed() {}
  setAutoDraw() {}

  dispose() {
    this.disposed = true;
    this.conn?.close();
    this.peer.destroy();
  }

  private emit() {
    if (this.view) this.view = { ...this.view }; // new snapshot so React re-renders on connection changes
    this.listeners.forEach((fn) => fn());
  }

  private connect() {
    if (this.disposed || this.rejected) return;
    const conn = this.peer.connect(peerIdFor(this.roomCode), { reliable: true });
    this.conn = conn;
    conn.on('open', () => {
      this.retries = 0;
      conn.send({ t: 'hello', clientId: this.me, name: this.name, avatar: this.avatar } satisfies GuestMessage);
    });
    conn.on('data', (raw) => {
      const msg = raw as HostMessage;
      if (msg?.t === 'view') {
        this.view = msg.view;
        this.connection = 'online';
        this.connectionNote = '';
        this.listeners.forEach((fn) => fn());
      } else if (msg?.t === 'reject') {
        this.rejected = true;
        this.connection = 'error';
        this.connectionNote = msg.reason;
        this.emit();
      }
    });
    conn.on('close', () => {
      if (!this.disposed && !this.rejected) this.fail('Sambungan terputus. Cuba sambung semula…', true);
    });
  }

  private fail(note: string, retry: boolean) {
    if (this.rejected) return;
    const canRetry = retry && this.retries < MAX_RETRIES;
    this.connection = canRetry ? 'lost' : 'error';
    this.connectionNote = canRetry ? note : note.replace('Cuba sambung semula…', 'Sila cuba lagi.');
    this.emit();
    if (canRetry) {
      this.retries++;
      setTimeout(() => {
        if (this.peer.disconnected) this.peer.reconnect();
        this.connect();
      }, RETRY_MS);
    }
  }
}
