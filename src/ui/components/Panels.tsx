import { useEffect, useRef, useState } from 'react';
import { chipImage, food } from '../../engine/foods';
import type { FoodId, GameView, Milestone } from '../../engine/types';
import { Avatar, fmt } from './common';
import { Icon } from './Icon';

export function TopBar({ view }: { view: GameView }) {
  const left = Object.values(view.remaining).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="stat-box" aria-label={`Cabutan ${view.drawIndex} daripada ${view.config.draws}`}>
        <b>
          {view.drawIndex}/{view.config.draws}
        </b>
        <span>Cabutan</span>
      </div>
      <div className="round-box" aria-label={`Pusingan ${view.round} daripada ${view.config.rounds}`}>
        <span className="display">
          PUSINGAN {view.round}/{view.config.rounds}
        </span>
        <div className="round-dots" aria-hidden>
          {Array.from({ length: view.config.rounds }, (_, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <b />}
              <i className={i < view.round ? 'on' : ''} />
            </span>
          ))}
        </div>
      </div>
      <div className="stat-box" aria-label={`${left} token tinggal`}>
        <b>{left}</b>
        <span>Token Tinggal</span>
      </div>
    </>
  );
}

const STATUS_TEXT = { ready: 'Sedia', thinking: 'Berfikir…', waiting: 'Menunggu' } as const;

export function Players({ view, reactions }: { view: GameView; reactions: Record<string, { id: number; text: string } | undefined> }) {
  const ranked = [...view.players].sort((a, b) => view.scores[b.id] - view.scores[a.id]);
  const anyScore = Object.values(view.scores).some((s) => s !== 0);
  return (
    <section className="panel players" aria-label="Pemain">
      {view.players.map((p) => {
        const isDrawer = view.drawerId === p.id;
        const away = p.connected === false;
        const st = away ? 'away' : isDrawer ? 'turn' : view.status[p.id];
        const text = away ? 'Terputus · auto' : isDrawer ? 'Giliran mengacau' : STATUS_TEXT[view.status[p.id]];
        const rank = ranked.indexOf(p) + 1;
        const r = reactions[p.id];
        return (
          <div key={p.id} className={`player ${p.id === view.me ? 'me' : ''} st-${st}`} aria-label={`${p.name}${p.id === view.me ? ' (anda)' : ''}, ${view.scores[p.id]} mata, ${text}`}>
            <div className="player-av">
              <Avatar id={p.avatar} name="" />
              {anyScore && rank === 1 && (
                <span className="crown" aria-hidden>
                  <Icon name="crown" size={18} />
                </span>
              )}
            </div>
            <div className="who">
              <div className="pname">{p.name}</div>
              <div className="pstatus">
                <i aria-hidden />
                {text}
              </div>
            </div>
            <div className={`pscore ${view.scores[p.id] < 0 ? 'neg' : ''}`}>{fmt(view.scores[p.id])}</div>
            {r && (
              <span key={r.id} className="bubble" role="status">
                {r.text}
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function Composition({ view }: { view: GameView }) {
  const left = Object.values(view.remaining).reduce((a, b) => a + b, 0);
  const last = view.drawn[view.drawn.length - 1];
  const [flash, setFlash] = useState<{ f: FoodId; k: number } | null>(null);
  const prev = useRef(view.drawIndex);
  useEffect(() => {
    if (view.drawIndex > prev.current && last) setFlash({ f: last, k: view.drawIndex });
    prev.current = view.drawIndex;
  }, [view.drawIndex, last]);

  return (
    <section className="panel comp" aria-label="Isi balang sekarang">
      <div className="comp-head">
        <h2 className="panel-title">BALANG SEKARANG</h2>
        <span className="pill">{left} token lagi</span>
      </div>
      <ul className="comp-list">
        {view.foods.map((f) => {
          const r = view.remaining[f];
          const s = view.startCounts[f];
          const out = s - r;
          const fd = food(f);
          return (
            <li
              key={flash?.f === f ? `${f}-${flash.k}` : f}
              className={`comp-row ${r === 0 ? 'zero' : ''} ${flash?.f === f ? 'flash' : ''}`}
              aria-label={`${fd.name}: ${r} tinggal daripada ${s}, ${out} sudah keluar`}
            >
              <img src={chipImage(f)} alt="" />
              <div className="bar-wrap">
                <div className="cname">{fd.name}</div>
                <div className="bar">
                  <i style={{ width: `${(r / s) * 100}%`, background: fd.color }} />
                </div>
                <small className="out">
                  {out} keluar daripada {s}
                </small>
              </div>
              <span className="count">{r}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function History({ view }: { view: GameView }) {
  const marks = new Set(view.config.milestones.map((m: Milestone) => m.afterDraw));
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [view.drawIndex]);
  return (
    <section className="panel history" aria-label="Urutan cabutan">
      <span className="history-label">Cabutan</span>
      <ol className="history-list" ref={listRef}>
        {Array.from({ length: view.config.draws }, (_, i) => {
          const f = view.drawn[i];
          const cls = [!f && 'empty', marks.has(i + 1) && 'mark', i === view.drawIndex - 1 && 'new'].filter(Boolean).join(' ');
          return (
            <li key={i} className={cls} title={f ? `${i + 1}. ${food(f).name}` : `Cabutan ${i + 1}`}>
              {f && <img src={chipImage(f)} alt={`${i + 1}. ${food(f).name}`} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
