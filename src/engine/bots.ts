import { estimate } from './probability';
import type { Rng } from './rng';
import type { GameView } from './types';

export interface BotPersonality {
  /** Added to every card's judged value so bots are imperfect. */
  noise: number;
  /** Probability a card must reach before the bot will KAW-KAW it. */
  kawkawAt: number;
}

export const randomPersonality = (rng: Rng): BotPersonality => ({
  noise: 40 + rng() * 120,
  kawkawAt: 0.62 + rng() * 0.3,
});

/** Bots reason from the public view only: the same information a human has. */
function judge(rng: Rng, view: GameView, me: BotPersonality) {
  const ps = estimate(rng, view.hand, view.drawn, view.remaining, view.startCounts, view.config.draws, 600);
  return view.hand
    .map((card, i) => ({
      card,
      p: ps[i],
      value: ps[i] * card.reward - (1 - ps[i]) * card.penalty + (rng() - 0.5) * me.noise,
    }))
    .sort((a, b) => b.value - a.value);
}

export function botDiscard(rng: Rng, view: GameView, me: BotPersonality): string[] {
  const keep = view.milestone?.keep ?? view.hand.length;
  return judge(rng, view, me)
    .slice(keep)
    .map((x) => x.card.id);
}

export function botFinal(rng: Rng, view: GameView, me: BotPersonality): { keep: string[]; kawkaw: string | null } {
  const keep = view.milestone?.keep ?? 2;
  const ranked = judge(rng, view, me).slice(0, keep);
  const open = ranked.filter((x) => view.handOutcomes[x.card.id] === 'open');
  const best = [...open].sort((a, b) => b.p * b.card.reward - a.p * a.card.reward)[0];
  const kawkaw = best && best.p >= me.kawkawAt ? best.card.id : null;
  return { keep: ranked.map((x) => x.card.id), kawkaw };
}

export const BOT_NAMES = ['Amirah', 'Daniel', 'Sabrina', 'Hafiz', 'Aisyah', 'Wei Jian', 'Kavitha', 'Amir', 'Aina', 'Mei Ling', 'Arjun', 'Farah'];

