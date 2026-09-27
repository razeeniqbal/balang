import type { Action } from '../engine/client';
import type { GameView } from '../engine/types';

/** Guest → host. */
export type GuestMessage = { t: 'hello'; clientId: string; name: string; avatar: string } | { t: 'act'; action: Action };

/** Host → guest. A view is already filtered to that one guest. */
export type HostMessage = { t: 'view'; view: GameView } | { t: 'reject'; reason: string };
