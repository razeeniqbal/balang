import type { GameConfig } from './types';

const rewardTiers: GameConfig['rewardTiers'] = [
  { minP: 0.8, reward: 100, penalty: 50 },
  { minP: 0.65, reward: 200, penalty: 50 },
  { minP: 0.55, reward: 250, penalty: 100 },
  { minP: 0.45, reward: 350, penalty: 100 },
  { minP: 0.38, reward: 400, penalty: 100 },
  { minP: 0.31, reward: 450, penalty: 150 },
  { minP: 0.24, reward: 500, penalty: 150 },
  { minP: 0.18, reward: 600, penalty: 200 },
  { minP: 0.12, reward: 750, penalty: 250 },
  { minP: 0, reward: 1000, penalty: 300 },
];

export const CLASSIC: GameConfig = {
  rounds: 3,
  foodsPerRound: 5,
  tokensPerRound: 25,
  minPerFood: 2,
  maxPerFood: 9,
  draws: 15,
  cardsDealt: 6,
  milestones: [
    { afterDraw: 3, keep: 4 },
    { afterDraw: 6, keep: 3 },
    { afterDraw: 10, keep: 2, lock: true },
  ],
  kawkawMultiplier: 2,
  rewardTiers,
  dealableP: [0.07, 0.9],
  drawSeconds: 20,
  decideSeconds: 45,
};

export const QUICK: GameConfig = { ...CLASSIC, rounds: 1 };

export const MODES = { classic: CLASSIC, quick: QUICK } as const;
export type ModeId = keyof typeof MODES;

/** Turn-timer presets offered in the lobby: [draw seconds, decision seconds]. */
export const TIMERS = {
  off: { drawSeconds: 0, decideSeconds: 0 },
  santai: { drawSeconds: 20, decideSeconds: 45 },
  laju: { drawSeconds: 10, decideSeconds: 25 },
} as const;
export type TimerId = keyof typeof TIMERS;
