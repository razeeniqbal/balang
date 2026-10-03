import { it } from 'vitest';
import { botDiscard, botFinal, randomPersonality } from './bots';
import { GameHost } from './game';
import { mulberry32 } from './rng';
import { isGood } from './types';

// Balance report, not an assertion suite: BALANCE=1 npx vitest run balance --silent=false
it.skipIf(!import.meta.env.BALANCE)('balance report', () => {
  const rng = mulberry32(42);
  let neg = 0, negHit = 0, good = 0, finals = 0, correct = 0, settledAtLock = 0, kaw = 0, kawWon = 0, roundScore = 0, rounds = 0;
  const tierHits: Record<number, [number, number]> = {};
  for (let m = 0; m < 60; m++) {
    const host = new GameHost(1000 + m);
    for (let i = 0; i < 4; i++) host.addPlayer({ id: `p${i}`, name: `P${i}`, avatar: 'a', isBot: true });
    const bots = host.players.map(() => randomPersonality(rng));
    host.startMatch('p0');
    while (host.phase !== 'FINAL_RESULTS') {
      if (host.phase === 'ROUND_REVEAL') host.beginDraws('p0');
      else if (host.phase === 'DRAW_PHASE') host.draw(host.drawerId()!);
      else if (host.phase === 'DECISION_PHASE') host.players.forEach((p, i) => host.discard(p.id, botDiscard(rng, host.view(p.id), bots[i])));
      else if (host.phase === 'FINAL_PREDICTION') {
        host.players.forEach((p, i) => {
          const v = host.view(p.id);
          const d = botFinal(rng, v, bots[i]);
          settledAtLock += d.keep.filter((id) => v.handOutcomes[id] !== 'open').length;
          host.submitFinal(p.id, d.keep, d.negative, d.kawkaw);
        });
      } else if (host.phase === 'ROUND_RESOLUTION') {
        for (const e of host.view('p0').lastRoundEvents) {
          finals++; correct += +e.correct; good += +isGood(e); roundScore += e.delta;
          if (e.side === 'negative') { neg++; negHit += +e.correct; }
          if (e.kawkaw) { kaw++; kawWon += +e.correct; }
          const t = (tierHits[e.card.reward] ??= [0, 0]); t[0]++; t[1] += +e.correct;
        }
        rounds++;
        host.nextRound('p0');
      }
    }
  }
  console.log({
    cameTrue: (correct / finals).toFixed(2),
    goodResults: (good / finals).toFixed(2),
    negativeCardHit: (negHit / neg).toFixed(2),
    settledAtLock: (settledAtLock / finals).toFixed(2),
    kawkawRate: (kaw / (rounds * 4)).toFixed(2),
    kawkawWin: (kawWon / kaw).toFixed(2),
    avgRoundScorePerPlayer: Math.round(roundScore / (rounds * 4)),
    keptByTier: Object.fromEntries(Object.entries(tierHits).map(([k, [n, w]]) => [k, `${n} kept, ${Math.round((100 * w) / n)}% hit`])),
  });
});
