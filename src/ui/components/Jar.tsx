import { useEffect, useRef, useState } from 'react';
import { food, foodImage } from '../../engine/foods';
import type { FoodId } from '../../engine/types';

interface VisualToken {
  vid: number;
  food: FoodId;
  rot: number;
  jx: number;
  jy: number;
}

const COLS = 5;

/** Slot position (percent of the token area); rows pile up from the bottom. */
function slot(i: number, t: VisualToken) {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  const offset = row % 2 ? 3.5 : -1;
  return { left: offset + col * 19 + t.jx, bottom: row * 15 + t.jy };
}

/**
 * Purely visual: the pile's order is random and independent of the real
 * draw sequence, so nothing about future draws is leaked by the picture.
 */
function buildPile(foods: FoodId[], counts: Record<FoodId, number>): VisualToken[] {
  const pile: VisualToken[] = [];
  let vid = 0;
  for (const f of foods) {
    for (let i = 0; i < counts[f]; i++) {
      pile.push({ vid: vid++, food: f, rot: Math.random() * 60 - 30, jx: Math.random() * 4 - 2, jy: Math.random() * 3 });
    }
  }
  for (let i = pile.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pile[i], pile[j]] = [pile[j], pile[i]];
  }
  return pile;
}

interface Props {
  roundKey: string;
  foods: FoodId[];
  startCounts: Record<FoodId, number>;
  remaining: Record<FoodId, number>;
  shaking: boolean;
  canDraw: boolean;
  onDraw: () => void;
}

export function Jar({ roundKey, foods, startCounts, remaining, shaking, canDraw, onDraw }: Props) {
  const [pile, setPile] = useState<VisualToken[]>(() => buildPile(foods, startCounts));
  const round = useRef(roundKey);

  useEffect(() => {
    if (round.current !== roundKey) {
      round.current = roundKey;
      setPile(buildPile(foods, startCounts));
      return;
    }
    // Remove tokens that left the balang, taking them from the top of the pile.
    setPile((prev) => {
      const next = [...prev];
      for (const f of foods) {
        let extra = next.filter((t) => t.food === f).length - (remaining[f] ?? 0);
        for (let i = next.length - 1; i >= 0 && extra > 0; i--) {
          if (next[i].food === f) {
            next.splice(i, 1);
            extra--;
          }
        }
      }
      return next.length === prev.length ? prev : next;
    });
  }, [roundKey, foods, startCounts, remaining]);

  const total = Object.values(remaining).reduce((a, b) => a + b, 0);
  const label = `Balang: ${total} token tinggal. ${foods.map((f) => `${food(f).name} ${remaining[f]}`).join(', ')}.${canDraw ? ' Tekan untuk kacau dan ambil token.' : ''}`;

  return (
    <div className="jar-wrap">
      <div className="jar-mat" aria-hidden />
      <button className={`jar ${shaking ? 'shake' : ''}`} onClick={onDraw} disabled={!canDraw} aria-label={label}>
        <svg viewBox="0 0 300 390" aria-hidden>
          <defs>
            <linearGradient id="glass" x1="0" x2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="0.18" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="0.8" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* back of the glass */}
          <path d="M58 120 h184 v14 q32 10 32 52 v150 q0 42 -42 42 h-164 q-42 0 -42 -42 v-150 q0 -42 32 -52 z" fill="rgba(210,235,240,0.14)" />
        </svg>
        <div className="jar-tokens">
          {pile.map((t, i) => {
            const p = slot(i, t);
            return (
              <div
                key={t.vid}
                className="jar-token"
                style={{ left: `${p.left}%`, bottom: `${p.bottom}%`, transform: `rotate(${t.rot}deg)`, zIndex: 100 - Math.floor(i / COLS) }}
              >
                <img src={foodImage(t.food)} alt="" draggable={false} />
              </div>
            );
          })}
        </div>
        <svg viewBox="0 0 300 390" aria-hidden style={{ pointerEvents: 'none' }}>
          {/* front of the glass: outline, rims and highlights */}
          <path
            d="M58 120 h184 v14 q32 10 32 52 v150 q0 42 -42 42 h-164 q-42 0 -42 -42 v-150 q0 -42 32 -52 z"
            fill="url(#glass)"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="3"
          />
          <rect x="54" y="114" width="192" height="22" rx="8" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          <path d="M44 190 q-2 80 4 150" stroke="rgba(255,255,255,0.75)" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M62 176 q-2 30 0 52" stroke="rgba(255,255,255,0.5)" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M258 200 q4 60 -2 130" stroke="rgba(255,255,255,0.35)" strokeWidth="6" strokeLinecap="round" fill="none" />
          <ellipse cx="150" cy="370" rx="118" ry="8" fill="rgba(255,255,255,0.18)" />
        </svg>
        <img className="jar-lid" src="/assets/jar/lid.png" alt="" draggable={false} />
      </button>
    </div>
  );
}
