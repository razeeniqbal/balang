export type FoodId = string;

export interface Food {
  id: FoodId;
  name: string;
  /** Ring colour of the token chip, also used for composition bars. */
  color: string;
}

export type CardKind =
  | 'BANYAK_LAGI'
  | 'SIAPA_DULU'
  | 'AWAL_AWAL'
  | 'DOUBLE'
  | 'DOMINAN'
  | 'DUA_ATAU_KURANG'
  | 'TEPAT'
  | 'JIRAN'
  | 'TAK_KELUAR'
  | 'LAST_SEKALI'
  | 'PALING_KURANG'
  | 'MASIH_ADA';

export interface PredictionCard {
  id: string;
  kind: CardKind;
  a: FoodId;
  b?: FoodId;
  n?: number;
  /** Points the card is worth: gained on the positive side, lost on the negative side. */
  reward: number;
}

/** Whether a card's condition is already settled by what has been drawn. */
export type CardOutcome = 'open' | 'true' | 'false';

export interface Milestone {
  /** Decision happens once this many draws are complete. */
  afterDraw: number;
  /** Hand size after the decision. */
  keep: number;
  /** Final decision: place the hand (one card negative) and choose KAW-KAW. */
  lock?: boolean;
}

export interface GameConfig {
  rounds: number;
  foodsPerRound: number;
  tokensPerRound: number;
  minPerFood: number;
  maxPerFood: number;
  draws: number;
  cardsDealt: number;
  milestones: Milestone[];
  kawkawMultiplier: number;
  /** Reward tiers ordered from most likely (cheap) to least likely (expensive). */
  rewardTiers: { minP: number; reward: number }[];
  /** Cards outside this probability band at deal time are never dealt. */
  dealableP: [number, number];
  /** Seconds per draw turn and per decision; 0 turns the timer off. */
  drawSeconds: number;
  decideSeconds: number;
}

export interface TurnTimer {
  kind: 'draw' | 'decide';
  /** Milliseconds left when this view was produced. */
  endsIn: number;
  total: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isHost: boolean;
  /** Set for remote players; false while they are disconnected. */
  connected?: boolean;
}

export type Phase =
  | 'LOBBY'
  | 'ROUND_REVEAL'
  | 'DRAW_PHASE'
  | 'DECISION_PHASE'
  | 'FINAL_PREDICTION'
  | 'ROUND_RESOLUTION'
  | 'FINAL_RESULTS';

export interface ScoreEvent {
  round: number;
  playerId: string;
  card: PredictionCard;
  /** The card's condition came true. */
  correct: boolean;
  /** Negative-side cards cost points when they come true. */
  side: 'positive' | 'negative';
  kawkaw: boolean;
  delta: number;
}

/** A result that helped the player: a positive card came true, or a negative card did not. */
export const isGood = (e: Pick<ScoreEvent, 'correct' | 'side'>) => (e.side === 'positive' ? e.correct : !e.correct);

export interface Reaction {
  id: number;
  playerId: string;
  text: string;
  at: number;
}

export type PlayerStatus = 'ready' | 'thinking' | 'waiting';

/** Everything one player is allowed to see. Built by GameHost.view(). */
export interface GameView {
  phase: Phase;
  config: GameConfig;
  roomCode: string;
  players: Player[];
  scores: Record<string, number>;
  me: string;
  round: number;
  foods: FoodId[];
  startCounts: Record<FoodId, number>;
  remaining: Record<FoodId, number>;
  drawn: FoodId[];
  drawIndex: number;
  drawerId: string | null;
  milestone: Milestone | null;
  nextMilestone: Milestone | null;
  status: Record<string, PlayerStatus>;
  hand: PredictionCard[];
  handOutcomes: Record<string, CardOutcome>;
  locked: boolean;
  kawkawCardId: string | null;
  negativeCardId: string | null;
  /** Hand sizes of every player (contents stay private until resolution). */
  handSizes: Record<string, number>;
  lastRoundEvents: ScoreEvent[];
  events: ScoreEvent[];
  reactions: Reaction[];
  /** Filled in by the host device; null when no timer is running. */
  timer: TurnTimer | null;
  version: number;
}
