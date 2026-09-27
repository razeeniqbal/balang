import { evaluateWithStart, type CardSpec } from './predictions';
import type { Rng } from './rng';
import type { FoodId } from './types';

/**
 * Monte Carlo estimate of each card coming true, given only public
 * information: what has been drawn and what is still in the balang.
 */
export function estimate(
  rng: Rng,
  cards: CardSpec[],
  drawn: FoodId[],
  remaining: Record<FoodId, number>,
  start: Record<FoodId, number>,
  totalDraws: number,
  sims = 1500,
): number[] {
  const pool: FoodId[] = [];
  for (const [f, n] of Object.entries(remaining)) for (let i = 0; i < n; i++) pool.push(f);
  const left = totalDraws - drawn.length;
  const hits = new Array(cards.length).fill(0);
  const seq = [...drawn];
  for (let s = 0; s < sims; s++) {
    // Partial Fisher–Yates: only the next `left` tokens matter.
    for (let i = 0; i < left; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
      seq[drawn.length + i] = pool[i];
    }
    for (let c = 0; c < cards.length; c++) if (evaluateWithStart(cards[c], seq, start)) hits[c]++;
  }
  return hits.map((h) => h / sims);
}
