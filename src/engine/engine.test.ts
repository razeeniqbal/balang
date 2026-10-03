import { describe, expect, it } from 'vitest';
import { botDiscard, botFinal, randomPersonality } from './bots';
import { CLASSIC } from './config';
import { GameHost } from './game';
import { candidateSpecs, evaluateWithStart, outcome } from './predictions';
import { mulberry32 } from './rng';
import { statsFor } from './stats';

function playMatch(seed: number, players = 4) {
  const host = new GameHost(seed);
  const rng = mulberry32(seed + 1);
  for (let i = 0; i < players; i++) host.addPlayer({ id: `p${i}`, name: `P${i}`, avatar: 'avatar-01', isBot: true });
  host.startMatch('p0');
  const settledChecks: { card: any; seen: string; round: number }[] = [];
  const persona = randomPersonality(rng);
  while (host.phase !== 'FINAL_RESULTS') {
    if (host.phase === 'ROUND_REVEAL') host.beginDraws('p0');
    else if (host.phase === 'DRAW_PHASE') {
      const v = host.view('p0');
      for (const c of v.hand) {
        const o = v.handOutcomes[c.id];
        if (o !== 'open') settledChecks.push({ card: c, seen: o, round: v.round });
      }
      host.draw(v.drawerId!);
    } else if (host.phase === 'DECISION_PHASE') {
      for (const p of host.players) {
        const v = host.view(p.id);
        if (v.status[p.id] === 'thinking') expect(host.discard(p.id, botDiscard(rng, v, persona))).toBe(true);
      }
    } else if (host.phase === 'FINAL_PREDICTION') {
      for (const p of host.players) {
        const v = host.view(p.id);
        const { keep, negative, kawkaw } = botFinal(rng, v, persona);
        expect(host.submitFinal(p.id, keep, negative, kawkaw)).toBe(true);
      }
    } else if (host.phase === 'ROUND_RESOLUTION') {
      const v = host.view('p0');
      expect(v.drawn).toHaveLength(CLASSIC.draws);
      expect(Object.values(v.remaining).reduce((a, b) => a + b, 0)).toBe(CLASSIC.tokensPerRound - CLASSIC.draws);
      // Every card that was shown as settled must resolve that way.
      for (const s of settledChecks.filter((x) => x.round === v.round)) {
        const ev = v.lastRoundEvents.find((e) => e.card.id === s.card.id);
        if (ev) expect(String(ev.correct)).toBe(s.seen);
      }
      host.nextRound('p0');
    }
  }
  return host;
}

describe('GameHost', () => {
  it('plays full classic matches with consistent scores', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const host = playMatch(seed, 2 + (seed % 5));
      const v = host.view('p0');
      expect(v.round).toBe(3);
      for (const p of host.players) {
        const sum = v.events.filter((e) => e.playerId === p.id).reduce((s, e) => s + e.delta, 0);
        expect(v.scores[p.id]).toBe(sum);
        const mine = v.events.filter((e) => e.playerId === p.id);
        expect(mine).toHaveLength(9); // 3 placed cards × 3 rounds
        for (const e of mine) {
          // Positive: +value if true, else 0. Negative: -value if true, else 0. KAW-KAW: x2 if true, -value if not.
          const expected = e.side === 'negative' ? (e.correct ? -e.card.reward : 0) : e.kawkaw ? (e.correct ? 2 * e.card.reward : -e.card.reward) : e.correct ? e.card.reward : 0;
          expect(e.delta).toBe(expected);
        }
        expect(mine.filter((e) => e.side === 'negative')).toHaveLength(3); // one per round
        expect(statsFor(v.events, p.id).total).toBe(9);
      }
    }
  });

  it('deals six priced cards and keeps other hands private', () => {
    const host = new GameHost(7);
    host.addPlayer({ id: 'a', name: 'A', avatar: 'avatar-01', isBot: false });
    host.addPlayer({ id: 'b', name: 'B', avatar: 'avatar-02', isBot: true });
    host.startMatch('a');
    const v = host.view('a');
    expect(v.hand).toHaveLength(6);
    expect(Object.values(v.startCounts).reduce((x, y) => x + y, 0)).toBe(25);
    expect(v.foods).toHaveLength(5);
    expect(JSON.stringify(v)).not.toContain('r1-p1-'); // B's card ids never leak
    expect(v.drawn).toHaveLength(0);
  });

  it('rejects invalid actions', () => {
    const host = new GameHost(3);
    host.addPlayer({ id: 'a', name: 'A', avatar: 'avatar-01', isBot: false });
    host.addPlayer({ id: 'b', name: 'B', avatar: 'avatar-02', isBot: true });
    host.startMatch('b'); // not host
    expect(host.phase).toBe('LOBBY');
    host.startMatch('a');
    host.beginDraws('a');
    const drawer = host.drawerId()!;
    const other = drawer === 'a' ? 'b' : 'a';
    expect(host.draw(other)).toBeNull();
    expect(host.draw(drawer)).not.toBeNull();
  });
});

describe('outcome()', () => {
  it('never claims certainty that the final result contradicts', () => {
    const rng = mulberry32(99);
    for (let trial = 0; trial < 150; trial++) {
      const foods = ['onde-onde', 'dodol', 'muruku', 'kuih-lapis', 'curry-puff'];
      const start = { 'onde-onde': 7, dodol: 6, muruku: 5, 'kuih-lapis': 4, 'curry-puff': 3 } as Record<string, number>;
      const bag = foods.flatMap((f) => Array(start[f]).fill(f));
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      const seq = bag.slice(0, 15);
      for (const spec of candidateSpecs(rng, foods, start, CLASSIC, 40)) {
        const final = evaluateWithStart(spec, seq, start);
        for (let d = 0; d <= 15; d++) {
          const drawn = seq.slice(0, d);
          const rem = { ...start };
          drawn.forEach((f) => rem[f]--);
          const o = outcome(spec, drawn, rem, 15);
          if (o !== 'open') expect(o, `${spec.kind} at draw ${d}`).toBe(String(final));
        }
        const end = seq.slice(0, 15);
        const remEnd = { ...start };
        end.forEach((f) => remEnd[f]--);
        expect(outcome(spec, end, remEnd, 15)).toBe(String(final));
      }
    }
  });
});
