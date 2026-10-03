import { food } from './foods';
import { pick, randInt, shuffle, type Rng } from './rng';
import type { CardKind, CardOutcome, FoodId, GameConfig, PredictionCard } from './types';

/** A card before it has an id and price attached. */
export type CardSpec = Pick<PredictionCard, 'kind' | 'a' | 'b' | 'n'>;

const count = (seq: FoodId[], f: FoodId) => seq.reduce((c, x) => c + (x === f ? 1 : 0), 0);

function hasPair(seq: FoodId[], first: FoodId, second: FoodId) {
  for (let i = 1; i < seq.length; i++) if (seq[i - 1] === first && seq[i] === second) return true;
  return false;
}

/** Resolve a card against the full sequence of drawn tokens. */
export function evaluate(card: CardSpec, seq: FoodId[]): boolean {
  const { a, b = '', n = 0 } = card;
  switch (card.kind) {
    case 'BANYAK_LAGI':
      return count(seq, a) > count(seq, b);
    case 'SIAPA_DULU': {
      const ia = seq.indexOf(a);
      const ib = seq.indexOf(b);
      return ia !== -1 && (ib === -1 || ia < ib);
    }
    case 'AWAL_AWAL':
      return seq.slice(0, 3).includes(a);
    case 'DOUBLE':
      return hasPair(seq, a, a);
    case 'DOMINAN': {
      const ca = count(seq, a);
      const others = new Set(seq.filter((x) => x !== a));
      return ca > 0 && [...others].every((o) => count(seq, o) < ca);
    }
    case 'DUA_ATAU_KURANG':
      return count(seq, a) <= 2;
    case 'TEPAT':
      return count(seq, a) === n;
    case 'JIRAN':
      return hasPair(seq, a, b);
    case 'TAK_KELUAR':
      return count(seq, a) === 0;
    case 'LAST_SEKALI':
      return seq[seq.length - 1] === a;
    case 'PALING_KURANG':
      return count(seq, a) >= n;
    case 'MASIH_ADA':
      // Evaluated by the host with start counts; see evaluateWithStart.
      throw new Error('MASIH_ADA needs start counts');
  }
}

/** Evaluate any card, including those that depend on the starting composition. */
export function evaluateWithStart(card: CardSpec, seq: FoodId[], start: Record<FoodId, number>): boolean {
  if (card.kind === 'MASIH_ADA') return start[card.a] - count(seq, card.a) >= (card.n ?? 0);
  return evaluate(card, seq);
}

/**
 * Is the card already decided by the tokens drawn so far? Only returns a
 * settled result when it is logically certain, never on a guess.
 */
export function outcome(
  card: CardSpec,
  drawn: FoodId[],
  remaining: Record<FoodId, number>,
  totalDraws: number,
): CardOutcome {
  const { a, b = '', n = 0 } = card;
  const left = totalDraws - drawn.length;
  const pool = Object.values(remaining).reduce((s, x) => s + x, 0);
  const range = (f: FoodId) => {
    const r = remaining[f] ?? 0;
    return { min: Math.max(0, left - (pool - r)), max: Math.min(r, left) };
  };
  const c = (f: FoodId) => count(drawn, f);
  const settle = (t: boolean, f: boolean): CardOutcome => (t ? 'true' : f ? 'false' : 'open');
  if (left === 0) return finalOutcome(card, drawn, remaining);

  const ra = range(a);
  switch (card.kind) {
    case 'BANYAK_LAGI': {
      const rb = range(b);
      return settle(c(a) + ra.min > c(b) + rb.max, c(a) + ra.max <= c(b) + rb.min);
    }
    case 'SIAPA_DULU': {
      const ia = drawn.indexOf(a);
      const ib = drawn.indexOf(b);
      if (ia !== -1 || ib !== -1) return ia !== -1 && (ib === -1 || ia < ib) ? 'true' : 'false';
      return settle(false, (remaining[a] ?? 0) === 0);
    }
    case 'AWAL_AWAL':
      if (drawn.slice(0, 3).includes(a)) return 'true';
      return settle(false, drawn.length >= 3 || (remaining[a] ?? 0) === 0);
    case 'DOUBLE':
    case 'JIRAN': {
      const first = a;
      const second = card.kind === 'DOUBLE' ? a : b;
      if (hasPair(drawn, first, second)) return 'true';
      const lastIsFirst = drawn[drawn.length - 1] === first;
      const secondLeft = remaining[second] ?? 0;
      const firstLeft = remaining[first] ?? 0;
      if (secondLeft === 0) return 'false';
      // Need a fresh `first` followed by `second`, unless the last draw already was `first`.
      if (!lastIsFirst && (firstLeft === 0 || left < 2)) return 'false';
      if (!lastIsFirst && first === second && firstLeft < 2) return 'false';
      return 'open';
    }
    case 'DOMINAN': {
      const others = Object.keys(remaining).filter((f) => f !== a);
      const aMin = c(a) + ra.min;
      const aMax = c(a) + ra.max;
      const sure = aMin > 0 && others.every((o) => c(o) + range(o).max < aMin);
      const dead = aMax === 0 || others.some((o) => c(o) + range(o).min >= aMax);
      return settle(sure, dead);
    }
    case 'DUA_ATAU_KURANG':
      return settle(c(a) + ra.max <= 2, c(a) > 2);
    case 'TEPAT':
      return settle(c(a) + ra.min === n && c(a) + ra.max === n, c(a) > n || c(a) + ra.max < n);
    case 'TAK_KELUAR':
      return settle(ra.max === 0 && c(a) === 0, c(a) > 0);
    case 'LAST_SEKALI':
      return settle((remaining[a] ?? 0) === pool, (remaining[a] ?? 0) === 0);
    case 'PALING_KURANG':
      return settle(c(a) >= n, c(a) + ra.max < n);
    case 'MASIH_ADA': {
      const r = remaining[a] ?? 0;
      return settle(r - ra.max >= n, r - ra.min < n);
    }
  }
}

function finalOutcome(card: CardSpec, drawn: FoodId[], remaining: Record<FoodId, number>): CardOutcome {
  if (card.kind === 'MASIH_ADA') return (remaining[card.a] ?? 0) >= (card.n ?? 0) ? 'true' : 'false';
  return evaluate(card, drawn) ? 'true' : 'false';
}

const TITLES: Record<CardKind, (c: CardSpec) => string> = {
  BANYAK_LAGI: () => 'BANYAK LAGI',
  SIAPA_DULU: () => 'SIAPA DULU?',
  AWAL_AWAL: () => 'AWAL-AWAL',
  DOUBLE: () => 'DOUBLE',
  DOMINAN: () => 'DOMINAN',
  DUA_ATAU_KURANG: () => 'DUA ATAU KURANG',
  TEPAT: (c) => `TEPAT ${c.n}`,
  JIRAN: () => 'JIRAN',
  TAK_KELUAR: () => 'TAK KELUAR',
  LAST_SEKALI: () => 'LAST SEKALI',
  PALING_KURANG: (c) => `${c.n} KE ATAS`,
  MASIH_ADA: () => 'MASIH ADA',
};

export const cardTitle = (c: CardSpec) => TITLES[c.kind](c);

/** Plain-language description (Malay). Food names are always spelled out. */
export function cardText(c: CardSpec): string {
  const A = food(c.a).name;
  const B = c.b ? food(c.b).name : '';
  switch (c.kind) {
    case 'BANYAK_LAGI':
      return `Lebih banyak ${A} keluar berbanding ${B}.`;
    case 'SIAPA_DULU':
      return `${A} keluar dulu sebelum ${B}.`;
    case 'AWAL_AWAL':
      return `${A} keluar dalam 3 cabutan pertama.`;
    case 'DOUBLE':
      return `${A} keluar 2 kali berturut-turut.`;
    case 'DOMINAN':
      return `${A} paling banyak keluar.`;
    case 'DUA_ATAU_KURANG':
      return `${A} keluar 2 kali atau kurang.`;
    case 'TEPAT':
      return `${A} keluar tepat ${c.n} kali.`;
    case 'JIRAN':
      return `${B} keluar sejurus selepas ${A}.`;
    case 'TAK_KELUAR':
      return `Tiada ${A} langsung yang keluar.`;
    case 'LAST_SEKALI':
      return `Cabutan terakhir ialah ${A}.`;
    case 'PALING_KURANG':
      return `${A} keluar sekurang-kurangnya ${c.n} kali.`;
    case 'MASIH_ADA':
      return `Sekurang-kurangnya ${c.n} ${A} kekal dalam balang hingga akhir.`;
  }
}

/** Colour family of the card frame, by kind. */
export const CARD_TONE: Record<CardKind, 'cream' | 'gold' | 'green' | 'blue' | 'rose'> = {
  BANYAK_LAGI: 'cream',
  SIAPA_DULU: 'gold',
  AWAL_AWAL: 'green',
  DOUBLE: 'blue',
  DOMINAN: 'green',
  DUA_ATAU_KURANG: 'blue',
  TEPAT: 'gold',
  JIRAN: 'cream',
  TAK_KELUAR: 'rose',
  LAST_SEKALI: 'rose',
  PALING_KURANG: 'gold',
  MASIH_ADA: 'blue',
};

/** Random pool of candidate cards for a round's foods and starting counts. */
export function candidateSpecs(rng: Rng, foods: FoodId[], start: Record<FoodId, number>, cfg: GameConfig, size = 90): CardSpec[] {
  const drawFrac = cfg.draws / cfg.tokensPerRound;
  const out = new Map<string, CardSpec>();
  const two = () => {
    const [a, b] = shuffle(rng, [...foods]);
    return { a, b };
  };
  let guard = 0;
  while (out.size < size && guard++ < size * 20) {
    const kind = pick<CardKind>(rng, Object.keys(TITLES) as CardKind[]);
    const a = pick(rng, foods);
    const expected = start[a] * drawFrac;
    let spec: CardSpec;
    switch (kind) {
      case 'BANYAK_LAGI':
      case 'SIAPA_DULU':
      case 'JIRAN':
        spec = { kind, ...two() };
        break;
      case 'TEPAT':
        spec = { kind, a, n: Math.max(1, Math.min(start[a], Math.round(expected) + randInt(rng, -1, 1))) };
        break;
      case 'PALING_KURANG':
        spec = { kind, a, n: Math.max(2, Math.min(start[a], Math.round(expected) + randInt(rng, 0, 2))) };
        break;
      case 'MASIH_ADA':
        spec = { kind, a, n: Math.max(1, Math.min(start[a] - 1, Math.round(start[a] - expected) + randInt(rng, -1, 1))) };
        if (start[a] < 2) continue;
        break;
      default:
        spec = { kind, a };
    }
    out.set(specKey(spec), spec);
  }
  return [...out.values()];
}

export const specKey = (s: CardSpec) => `${s.kind}:${s.a}:${s.b ?? ''}:${s.n ?? ''}`;

export function priceFor(p: number, cfg: GameConfig) {
  const tier = cfg.rewardTiers.find((t) => p >= t.minP) ?? cfg.rewardTiers[cfg.rewardTiers.length - 1];
  return { reward: tier.reward };
}
