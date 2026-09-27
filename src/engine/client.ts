import type { GameHost } from './game';
import type { GameConfig, GameView } from './types';

/** Everything a player can ask the game to do. Sent over the wire by guests. */
export type Action =
  | { type: 'start' }
  | { type: 'beginDraws' }
  | { type: 'draw' }
  | { type: 'discard'; ids: string[] }
  | { type: 'final'; keep: string[]; kawkaw: string | null }
  | { type: 'react'; text: string }
  | { type: 'next' }
  | { type: 'again' }
  | { type: 'lobby' }
  | { type: 'config'; patch: Partial<Pick<GameConfig, 'rounds' | 'drawSeconds' | 'decideSeconds'>> }
  | { type: 'addBot' }
  | { type: 'remove'; id: string };

export type Connection = 'local' | 'connecting' | 'online' | 'lost' | 'error';

/** What the UI talks to: the same for the host device and for guests. */
export interface MatchClient {
  readonly me: string;
  readonly isHostDevice: boolean;
  connection: Connection;
  connectionNote: string;
  subscribe(fn: () => void): () => void;
  getView(): GameView | null;
  act(a: Action): void;
  setSpeed(fast: boolean): void;
  setAutoDraw(on: boolean): void;
  dispose(): void;
}

/** Apply a player action to the authority. Host-only actions are enforced by GameHost. */
export function applyAction(host: GameHost, pid: string, a: Action) {
  switch (a.type) {
    case 'start':
      return host.startMatch(pid);
    case 'beginDraws':
      return host.beginDraws(pid);
    case 'draw':
      return host.draw(pid);
    case 'discard':
      return host.discard(pid, a.ids);
    case 'final':
      return host.submitFinal(pid, a.keep, a.kawkaw);
    case 'react':
      return host.react(pid, String(a.text).slice(0, 20));
    case 'next':
      return host.nextRound(pid);
    case 'again':
      return host.playAgain(pid);
    case 'lobby':
      return host.backToLobby(pid);
  }
}

export function persistentClientId(): string {
  const KEY = 'balang.clientId';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = `p-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `p-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const peerIdFor = (roomCode: string) => `balang-${roomCode.toLowerCase()}`;

export function normaliseCode(input: string) {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  return digits.length === 4 ? `MY-${digits}` : null;
}
