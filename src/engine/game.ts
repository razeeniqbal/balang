import { CLASSIC } from './config';
import { FOOD_LIBRARY } from './foods';
import { candidateSpecs, evaluateWithStart, outcome, priceFor, type CardSpec } from './predictions';
import { estimate } from './probability';
import { mulberry32, randInt, shuffle, type Rng } from './rng';
import type {
  CardOutcome,
  FoodId,
  GameConfig,
  GameView,
  Milestone,
  Phase,
  Player,
  PlayerStatus,
  PredictionCard,
  Reaction,
  ScoreEvent,
} from './types';

export type AnalyticsEvent = { name: string; data?: Record<string, unknown> };

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

/**
 * The game authority. Owns the secret draw sequence and every player's hand;
 * clients only ever see the sanitised output of view(). Written so it can run
 * unchanged on a server for online multiplayer.
 */
export class GameHost {
  config: GameConfig = CLASSIC;
  roomCode: string;
  players: Player[] = [];
  scores: Record<string, number> = {};
  phase: Phase = 'LOBBY';
  round = 0;

  private rng: Rng;
  private foods: FoodId[] = [];
  private startCounts: Record<FoodId, number> = {};
  private sequence: FoodId[] = []; // secret
  private drawIndex = 0;
  private milestoneIdx = 0;
  private hands: Record<string, PredictionCard[]> = {};
  private pending = new Set<string>();
  private locked: Record<string, boolean> = {};
  private kawkaw: Record<string, string | null> = {};
  private events: ScoreEvent[] = [];
  private reactions: Reaction[] = [];
  private reactionSeq = 0;
  private version = 0;
  private listeners = new Set<() => void>();
  onAnalytics?: (e: AnalyticsEvent) => void;

  constructor(seed = Date.now()) {
    this.rng = mulberry32(seed);
    this.roomCode = `MY-${randInt(this.rng, 1000, 9999)}`;
  }

  // ── subscription ─────────────────────────────────────────────
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private changed() {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }
  private track(name: string, data?: Record<string, unknown>) {
    this.onAnalytics?.({ name, data });
  }

  // ── lobby ────────────────────────────────────────────────────
  addPlayer(p: Omit<Player, 'isHost'>): boolean {
    if (this.phase !== 'LOBBY' || this.players.length >= MAX_PLAYERS) return false;
    this.players.push({ ...p, isHost: this.players.length === 0 });
    this.scores[p.id] = 0;
    this.track('room_joined', { playerId: p.id, bot: p.isBot });
    this.changed();
    return true;
  }

  /** Online players only: shows who has dropped out (their turns are auto-played). */
  setConnected(id: string, connected: boolean) {
    const p = this.players.find((x) => x.id === id);
    if (!p || p.connected === connected) return;
    p.connected = connected;
    this.changed();
  }

  newRoomCode() {
    this.roomCode = `MY-${randInt(this.rng, 1000, 9999)}`;
    this.changed();
  }

  removePlayer(id: string) {
    if (this.phase !== 'LOBBY') return;
    const p = this.players.find((x) => x.id === id);
    if (!p || p.isHost) return;
    this.players = this.players.filter((x) => x.id !== id);
    delete this.scores[id];
    this.changed();
  }

  setConfig(cfg: GameConfig) {
    if (this.phase !== 'LOBBY') return;
    this.config = cfg;
    this.changed();
  }

  startMatch(byId: string) {
    if (this.phase !== 'LOBBY' || !this.isHost(byId) || this.players.length < MIN_PLAYERS) return;
    this.round = 0;
    this.events = [];
    for (const p of this.players) this.scores[p.id] = 0;
    this.track('match_started', { players: this.players.length, rounds: this.config.rounds });
    this.setupRound();
    this.changed();
  }

  // ── round flow ───────────────────────────────────────────────
  private setupRound() {
    const cfg = this.config;
    this.round++;
    this.foods = shuffle(this.rng, FOOD_LIBRARY.map((f) => f.id)).slice(0, cfg.foodsPerRound);
    this.startCounts = this.distribute();
    const bag: FoodId[] = [];
    for (const f of this.foods) for (let i = 0; i < this.startCounts[f]; i++) bag.push(f);
    this.sequence = shuffle(this.rng, bag);
    this.drawIndex = 0;
    this.milestoneIdx = 0;
    this.pending.clear();
    this.locked = {};
    this.kawkaw = {};
    this.deal();
    this.phase = 'ROUND_REVEAL';
    this.track('round_started', { round: this.round, counts: this.startCounts });
  }

  /** Random valid split of the tokens across the round's foods. */
  private distribute(): Record<FoodId, number> {
    const { foodsPerRound: k, tokensPerRound: total, minPerFood: lo, maxPerFood: hi } = this.config;
    const counts = new Array(k).fill(lo);
    let left = total - lo * k;
    while (left > 0) {
      const i = Math.floor(this.rng() * k);
      if (counts[i] < hi) {
        counts[i]++;
        left--;
      }
    }
    counts.sort((a, b) => b - a);
    return Object.fromEntries(this.foods.map((f, i) => [f, counts[i]]));
  }

  private deal() {
    const cfg = this.config;
    const specs = candidateSpecs(this.rng, this.foods, this.startCounts, cfg);
    const ps = estimate(this.rng, specs, [], this.startCounts, this.startCounts, cfg.draws, 2500);
    const priced = specs
      .map((s, i) => ({ spec: s, p: ps[i] }))
      .filter(({ p }) => p >= cfg.dealableP[0] && p <= cfg.dealableP[1]);
    const buckets = [
      priced.filter((x) => x.p >= 0.5),
      priced.filter((x) => x.p >= 0.25 && x.p < 0.5),
      priced.filter((x) => x.p < 0.25),
    ];
    const perBucket = Math.ceil(cfg.cardsDealt / buckets.length);
    this.players.forEach((pl, pi) => {
      const chosen: { spec: CardSpec; p: number }[] = [];
      const kinds = new Set<string>();
      const take = (from: { spec: CardSpec; p: number }[], n: number, uniqueKinds: boolean) => {
        for (const c of shuffle(this.rng, [...from])) {
          if (n <= 0 || chosen.length >= cfg.cardsDealt) break;
          if (chosen.includes(c) || (uniqueKinds && kinds.has(c.spec.kind))) continue;
          chosen.push(c);
          kinds.add(c.spec.kind);
          n--;
        }
      };
      for (const b of buckets) take(b, perBucket, true);
      take(priced, cfg.cardsDealt - chosen.length, true);
      take(priced, cfg.cardsDealt - chosen.length, false);
      this.hands[pl.id] = chosen
        .map(({ spec, p }, i) => ({ ...spec, ...priceFor(p, cfg), id: `r${this.round}-p${pi}-c${i}` }))
        .sort((x, y) => x.reward - y.reward);
    });
  }

  /** Host moves from the composition reveal into the draw loop. */
  beginDraws(byId: string) {
    if (this.phase !== 'ROUND_REVEAL' || !this.isHost(byId)) return;
    this.phase = 'DRAW_PHASE';
    this.changed();
  }

  drawerId(): string | null {
    if (this.phase !== 'DRAW_PHASE' || this.players.length === 0) return null;
    return this.players[(this.round - 1 + this.drawIndex) % this.players.length].id;
  }

  draw(byId: string): FoodId | null {
    if (this.phase !== 'DRAW_PHASE' || this.drawerId() !== byId) return null;
    const token = this.sequence[this.drawIndex++];
    this.track('token_drawn', { round: this.round, draw: this.drawIndex, token });
    const m = this.config.milestones[this.milestoneIdx];
    if (m && m.afterDraw === this.drawIndex) {
      this.phase = m.lock ? 'FINAL_PREDICTION' : 'DECISION_PHASE';
      this.pending = new Set(this.players.map((p) => p.id));
    } else if (this.drawIndex >= this.config.draws) {
      this.resolveRound();
    }
    this.changed();
    return token;
  }

  discard(byId: string, cardIds: string[]) {
    const m = this.config.milestones[this.milestoneIdx];
    const hand = this.hands[byId];
    if (this.phase !== 'DECISION_PHASE' || !this.pending.has(byId) || !m || !hand) return false;
    const unique = new Set(cardIds);
    if (unique.size !== hand.length - m.keep || ![...unique].every((id) => hand.some((c) => c.id === id))) return false;
    this.hands[byId] = hand.filter((c) => !unique.has(c.id));
    this.pending.delete(byId);
    this.track('prediction_discarded', { playerId: byId, cards: [...unique], afterDraw: this.drawIndex });
    this.afterDecision();
    this.changed();
    return true;
  }

  submitFinal(byId: string, keepIds: string[], kawkawId: string | null) {
    const m = this.config.milestones[this.milestoneIdx];
    const hand = this.hands[byId];
    if (this.phase !== 'FINAL_PREDICTION' || !this.pending.has(byId) || !m || !hand) return false;
    const keep = new Set(keepIds);
    if (keep.size !== m.keep || ![...keep].every((id) => hand.some((c) => c.id === id))) return false;
    if (kawkawId && !keep.has(kawkawId)) return false;
    // KAW-KAW is a risk: it can't be put on a card whose result is already known.
    const kawCard = hand.find((c) => c.id === kawkawId);
    if (kawCard && outcome(kawCard, this.sequence.slice(0, this.drawIndex), this.remaining(), this.config.draws) !== 'open') return false;
    this.hands[byId] = hand.filter((c) => keep.has(c.id));
    this.locked[byId] = true;
    this.kawkaw[byId] = kawkawId;
    this.pending.delete(byId);
    this.track('prediction_locked', { playerId: byId, cards: [...keep] });
    if (kawkawId) this.track('kawkaw_activated', { playerId: byId, card: kawkawId });
    this.afterDecision();
    this.changed();
    return true;
  }

  private afterDecision() {
    if (this.pending.size > 0) return;
    this.milestoneIdx++;
    this.phase = 'DRAW_PHASE';
    if (this.drawIndex >= this.config.draws) this.resolveRound();
  }

  private resolveRound() {
    const seq = this.sequence.slice(0, this.config.draws);
    for (const p of this.players) {
      for (const card of this.hands[p.id] ?? []) {
        const correct = evaluateWithStart(card, seq, this.startCounts);
        const kaw = this.kawkaw[p.id] === card.id;
        const mult = kaw ? this.config.kawkawMultiplier : 1;
        const delta = correct ? card.reward * mult : -card.penalty * mult;
        this.scores[p.id] += delta;
        this.events.push({ round: this.round, playerId: p.id, card, correct, kawkaw: kaw, delta });
        this.track('prediction_resolved', { playerId: p.id, card: card.id, correct, kawkaw: kaw, delta });
      }
    }
    this.phase = 'ROUND_RESOLUTION';
    this.track('round_completed', { round: this.round });
  }

  nextRound(byId: string) {
    if (this.phase !== 'ROUND_RESOLUTION' || !this.isHost(byId)) return;
    if (this.round >= this.config.rounds) {
      this.phase = 'FINAL_RESULTS';
      this.track('match_completed', { scores: this.scores });
    } else {
      this.setupRound();
    }
    this.changed();
  }

  playAgain(byId: string) {
    if (this.phase !== 'FINAL_RESULTS' || !this.isHost(byId)) return;
    this.track('play_again_clicked');
    this.phase = 'LOBBY';
    this.startMatch(byId);
  }

  backToLobby(byId: string) {
    if (!this.isHost(byId)) return;
    this.phase = 'LOBBY';
    this.round = 0;
    this.events = [];
    this.changed();
  }

  react(byId: string, text: string) {
    if (!this.players.some((p) => p.id === byId)) return;
    this.reactions = [...this.reactions.slice(-11), { id: ++this.reactionSeq, playerId: byId, text, at: Date.now() }];
    this.changed();
  }

  // ── views ────────────────────────────────────────────────────
  private isHost(id: string) {
    return this.players.find((p) => p.id === id)?.isHost ?? false;
  }

  private remaining(): Record<FoodId, number> {
    const r = { ...this.startCounts };
    for (let i = 0; i < this.drawIndex; i++) r[this.sequence[i]]--;
    return r;
  }

  private statusOf(id: string): PlayerStatus {
    if (this.phase === 'DECISION_PHASE' || this.phase === 'FINAL_PREDICTION') {
      return this.pending.has(id) ? 'thinking' : 'ready';
    }
    if (this.phase === 'DRAW_PHASE') return this.drawerId() === id ? 'thinking' : 'waiting';
    return 'ready';
  }

  view(me: string): GameView {
    const drawn = this.sequence.slice(0, this.drawIndex);
    const remaining = this.remaining();
    const hand = this.hands[me] ?? [];
    const handOutcomes: Record<string, CardOutcome> = {};
    for (const c of hand) handOutcomes[c.id] = outcome(c, drawn, remaining, this.config.draws);
    const inDecision = this.phase === 'DECISION_PHASE' || this.phase === 'FINAL_PREDICTION';
    const milestone: Milestone | null = inDecision ? this.config.milestones[this.milestoneIdx] : null;
    return {
      phase: this.phase,
      config: this.config,
      roomCode: this.roomCode,
      players: this.players.map((p) => ({ ...p })),
      scores: { ...this.scores },
      me,
      round: this.round,
      foods: [...this.foods],
      startCounts: { ...this.startCounts },
      remaining,
      drawn,
      drawIndex: this.drawIndex,
      drawerId: this.drawerId(),
      milestone,
      nextMilestone: this.config.milestones[this.milestoneIdx] ?? null,
      status: Object.fromEntries(this.players.map((p) => [p.id, this.statusOf(p.id)])),
      hand: hand.map((c) => ({ ...c })),
      handOutcomes,
      locked: this.locked[me] ?? false,
      kawkawCardId: this.kawkaw[me] ?? null,
      handSizes: Object.fromEntries(this.players.map((p) => [p.id, this.hands[p.id]?.length ?? 0])),
      lastRoundEvents: this.events.filter((e) => e.round === this.round && this.phase !== 'LOBBY'),
      events: this.phase === 'ROUND_RESOLUTION' || this.phase === 'FINAL_RESULTS' ? [...this.events] : this.events.filter((e) => e.round < this.round),
      reactions: [...this.reactions],
      timer: null,
      version: this.version,
    };
  }
}
