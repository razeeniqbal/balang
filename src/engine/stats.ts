import { isGood, type ScoreEvent } from './types';

export interface PlayerStats {
  total: number;
  correct: number;
  accuracy: number;
  best: ScoreEvent | null;
  worst: ScoreEvent | null;
  kawkawTried: number;
  kawkawWon: number;
  longestStreak: number;
}

/** Derived purely from resolved score events, never decorative values. */
export function statsFor(events: ScoreEvent[], playerId: string): PlayerStats {
  const mine = events.filter((e) => e.playerId === playerId);
  let streak = 0;
  let longestStreak = 0;
  for (const e of mine) {
    streak = isGood(e) ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }
  const wins = mine.filter((e) => e.delta > 0);
  const losses = mine.filter((e) => e.delta < 0);
  const good = mine.filter(isGood);
  const kaw = mine.filter((e) => e.kawkaw);
  return {
    total: mine.length,
    correct: good.length,
    accuracy: mine.length ? good.length / mine.length : 0,
    best: wins.reduce<ScoreEvent | null>((b, e) => (!b || e.delta > b.delta ? e : b), null),
    worst: losses.reduce<ScoreEvent | null>((b, e) => (!b || e.delta < b.delta ? e : b), null),
    kawkawTried: kaw.length,
    kawkawWon: kaw.filter((e) => e.correct).length,
    longestStreak,
  };
}

export function ranking<P extends { id: string }>(players: P[], scores: Record<string, number>): P[] {
  return [...players].sort((a, b) => scores[b.id] - scores[a.id]);
}
