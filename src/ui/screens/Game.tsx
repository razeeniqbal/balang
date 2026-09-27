import { useEffect, useRef, useState } from 'react';
import type { MatchClient } from '../../engine/client';
import { food, foodImage } from '../../engine/foods';
import type { GameView, PredictionCard } from '../../engine/types';
import { TIMING } from '../../net/host';
import { Card, type CardState } from '../components/Card';
import { Logo, Modal, fmt } from '../components/common';
import { Icon } from '../components/Icon';
import { Jar } from '../components/Jar';
import { Composition, History, Players, TopBar } from '../components/Panels';
import { useSettings } from '../settings';
import { sfx } from '../sfx';

const REACTIONS = ['KAW-KAW!', 'Wahh!', 'Alamak...', 'Hmm...', 'Wehhh!', 'Nice!'];

function useReactionBubbles(view: GameView) {
  const [bubbles, setBubbles] = useState<Record<string, { id: number; text: string } | undefined>>({});
  const seen = useRef(Math.max(0, ...view.reactions.map((r) => r.id)));
  useEffect(() => {
    const fresh = view.reactions.filter((r) => r.id > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map((r) => r.id));
    setBubbles((b) => ({ ...b, ...Object.fromEntries(fresh.map((r) => [r.playerId, { id: r.id, text: r.text }])) }));
    const timers = fresh.map((r) =>
      setTimeout(() => setBubbles((b) => (b[r.playerId]?.id === r.id ? { ...b, [r.playerId]: undefined } : b)), 2600),
    );
    return () => timers.forEach(clearTimeout);
  }, [view.reactions]);
  return bubbles;
}

function ReactionMenu({ onSend }: { onSend: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="react-menu">
      <button className="icon-btn" aria-expanded={open} aria-label="Hantar reaksi" onClick={() => setOpen(!open)}>
        <Icon name="chat" />
      </button>
      {open && (
        <div className="react-pop" role="menu">
          {REACTIONS.map((r) => (
            <button
              key={r}
              role="menuitem"
              onClick={() => {
                onSend(r);
                setOpen(false);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Game({ view, match, onSettings }: { view: GameView; match: MatchClient; onSettings: () => void }) {
  const [settings] = useSettings();
  const revealMs = TIMING[settings.fast ? 'fast' : 'normal'].reveal;
  const bubbles = useReactionBubbles(view);

  // ── draw animation ─────────────────────────────────────────
  const [revealing, setRevealing] = useState<{ food: string; by: string; k: number } | null>(null);
  const [shaking, setShaking] = useState(false);
  const lastDraw = useRef(view.drawIndex);
  const latest = useRef(view);
  latest.current = view;
  // Keyed on drawIndex only: views arrive as fresh objects (especially over the
  // network), and re-running on those would cancel the reveal timer mid-way.
  useEffect(() => {
    if (view.drawIndex <= lastDraw.current) {
      lastDraw.current = view.drawIndex;
      return;
    }
    lastDraw.current = view.drawIndex;
    const v = latest.current;
    const f = v.drawn[v.drawIndex - 1];
    const drawerIdx = (v.round - 1 + v.drawIndex - 1) % v.players.length;
    setShaking(true);
    setRevealing({ food: f, by: v.players[drawerIdx]?.name ?? '', k: v.drawIndex });
    sfx.shake();
    const t1 = setTimeout(() => setShaking(false), 550);
    const t2 = setTimeout(() => sfx.draw(), 250);
    const t3 = setTimeout(() => setRevealing(null), revealMs);
    return () => {
      [t1, t2, t3].forEach(clearTimeout);
      setShaking(false);
      setRevealing(null);
    };
  }, [view.drawIndex, revealMs]);

  // ── decisions ──────────────────────────────────────────────
  const [selected, setSelected] = useState<string[]>([]);
  const [kawOpen, setKawOpen] = useState(false);
  const [kawChoice, setKawChoice] = useState<string | null>(null);
  const decisionKey = `${view.round}:${view.phase}:${view.drawIndex}`;
  useEffect(() => {
    setSelected([]);
    setKawOpen(false);
    setKawChoice(null);
  }, [decisionKey]);

  const myTurn = view.phase === 'DRAW_PHASE' && view.drawerId === view.me;
  const inDecision = view.phase === 'DECISION_PHASE' || view.phase === 'FINAL_PREDICTION';
  const iMustDecide = !revealing && inDecision && view.status[view.me] === 'thinking';
  const discarding = iMustDecide && view.phase === 'DECISION_PHASE';
  const finalising = iMustDecide && view.phase === 'FINAL_PREDICTION';
  const need = discarding ? view.hand.length - (view.milestone?.keep ?? view.hand.length) : finalising ? (view.milestone?.keep ?? 2) : 0;
  const waitingOn = view.players.filter((p) => view.status[p.id] === 'thinking');

  const toggle = (id: string) => {
    sfx.select();
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= need ? [...s.slice(1), id] : [...s, id]));
  };

  const draw = () => match.act({ type: 'draw' });
  const confirmDiscard = () => {
    sfx.discard();
    match.act({ type: 'discard', ids: selected });
  };
  const submitFinal = (kaw: string | null) => {
    if (kaw) sfx.kawkaw();
    else sfx.lock();
    match.act({ type: 'final', keep: selected, kawkaw: kaw });
  };

  const drawerName = view.players.find((p) => p.id === view.drawerId)?.name;
  const nm = view.nextMilestone;
  const toMilestone = nm ? nm.afterDraw - view.drawIndex : 0;

  const cardState = (c: PredictionCard): CardState => {
    if (view.locked) return 'locked';
    if (discarding) return selected.includes(c.id) ? 'discard' : 'default';
    if (finalising) return selected.includes(c.id) ? 'keep' : 'default';
    return 'default';
  };

  // ── contextual action ──────────────────────────────────────
  let action;
  if (discarding) {
    action = (
      <>
        <p className="action-lead">
          Pilih <b>{need}</b> kad yang anda rasa makin tak mungkin.
        </p>
        <button className="btn btn-red" disabled={selected.length !== need} onClick={confirmDiscard}>
          <Icon name="trash" /> BUANG {selected.length}/{need} KAD
        </button>
      </>
    );
  } else if (finalising) {
    action = (
      <>
        <p className="action-lead">
          Pilih <b>{need}</b> kad terakhir untuk dikunci. Selepas ini anda boleh pilih KAW-KAW.
        </p>
        <button className="btn btn-green" disabled={selected.length !== need} onClick={() => setKawOpen(true)}>
          <Icon name="lock" /> KUNCI {selected.length}/{need} KAD
        </button>
      </>
    );
  } else if (inDecision && !revealing) {
    action = (
      <p className="action-lead">
        <span className="dots" aria-hidden /> Menunggu {waitingOn.map((p) => p.name).join(', ')}…
      </p>
    );
  } else if (view.locked) {
    const kc = view.hand.find((c) => c.id === view.kawkawCardId);
    action = (
      <p className="action-lead">
        <Icon name="lock" size={18} /> Pilihan dikunci.{' '}
        {kc ? (
          <>
            KAW-KAW pada <b>{food(kc.a).name}</b>.
          </>
        ) : (
          'Main selamat.'
        )}{' '}
        Tunggu {view.config.draws - view.drawIndex} cabutan lagi.
      </p>
    );
  } else if (nm) {
    action = (
      <div className="milestone">
        <span className="milestone-n">{Math.max(toMilestone, 0)}</span>
        <p className="action-lead">
          cabutan lagi sebelum anda perlu{' '}
          {nm.lock ? (
            <>
              <b>kunci {nm.keep} kad</b> &amp; pilih KAW-KAW
            </>
          ) : (
            <b>buang {view.hand.length - nm.keep} kad</b>
          )}
          .
        </p>
      </div>
    );
  }

  const keptCards = view.hand.filter((c) => selected.includes(c.id));

  return (
    <main className="game">
      <div className="g-logo">
        <Logo />
      </div>
      <div className="g-top">
        <TopBar view={view} />
      </div>
      <div className="g-tools">
        <ReactionMenu
          onSend={(text) => {
            sfx.pop();
            match.act({ type: 'react', text });
          }}
        />
        <button className="icon-btn" onClick={onSettings} aria-label="Tetapan">
          <Icon name="gear" />
        </button>
      </div>

      <div className="g-players">
        <Players view={view} reactions={bubbles} />
      </div>

      <div className="g-center">
        <Jar
          roundKey={`r${view.round}`}
          foods={view.foods}
          startCounts={view.startCounts}
          remaining={view.remaining}
          shaking={shaking}
          canDraw={myTurn && !revealing}
          onDraw={draw}
          showHint={view.drawIndex === 0}
        />
        {view.phase === 'DRAW_PHASE' && (
          <button className={`btn btn-kacau ${myTurn ? 'is-turn' : ''}`} disabled={!myTurn || !!revealing} onClick={draw}>
            {myTurn ? (
              <span className="btn-stack center">
                KACAU
                <small>Giliran anda — ambil token</small>
              </span>
            ) : (
              <span className="btn-stack center">
                Giliran {drawerName}
                <small>sedang mengacau…</small>
              </span>
            )}
          </button>
        )}
        <History view={view} />
      </div>

      <div className="g-comp">
        <Composition view={view} />
      </div>

      <div className="g-hand">
        <section className="panel hand-panel" aria-label="Kad ramalan anda">
          <div className="section-head">
            <h2 className="panel-title">KAD RAMALAN ANDA</h2>
            <span className="pill">{view.hand.length} kad</span>
          </div>
          <div className="cards">
            {view.hand.map((c) => (
              <Card
                key={c.id}
                card={c}
                state={cardState(c)}
                kawkaw={view.kawkawCardId === c.id}
                multiplier={view.config.kawkawMultiplier}
                settled={view.handOutcomes[c.id]}
                onClick={discarding || finalising ? () => toggle(c.id) : undefined}
              />
            ))}
          </div>
        </section>
        <section className={`panel action-panel ${discarding ? 'alert-red' : finalising ? 'alert-gold' : ''}`} aria-live="polite">
          {action}
        </section>
      </div>

      {revealing && (
        <div className="reveal" aria-live="assertive" style={{ ['--reveal-ms' as string]: `${revealMs}ms` }}>
          <div className="reveal-inner" key={revealing.k}>
            <div className="reveal-burst" aria-hidden />
            <img src={foodImage(revealing.food)} alt="" />
            <div className="reveal-name">{food(revealing.food).name}!</div>
            <div className="reveal-by">
              Cabutan {revealing.k} · {revealing.by}
            </div>
          </div>
        </div>
      )}

      {kawOpen && finalising && (
        <Modal label="Kunci kad dan KAW-KAW" onClose={() => setKawOpen(false)}>
          <h2 className="banner-title">KAW-KAW?</h2>
          <p className="banner-sub">Gandakan risiko, gandakan ganjaran — atau main selamat.</p>
          <div className="kaw-grid">
            {keptCards.map((c) => {
              const m = view.config.kawkawMultiplier;
              const on = kawChoice === c.id;
              const known = view.handOutcomes[c.id] !== 'open';
              return (
                <div key={c.id} className="kaw-option">
                  <Card
                    card={c}
                    kawkaw={on}
                    multiplier={m}
                    settled={view.handOutcomes[c.id]}
                    state={on ? 'keep' : 'default'}
                    disabled={known}
                    onClick={() => setKawChoice(on ? null : c.id)}
                  />
                  {known ? (
                    <div className="kaw-preview off">Dah pasti — tak boleh KAW-KAW</div>
                  ) : (
                    <div className="kaw-preview" aria-label={`Jika KAW-KAW: ganjaran ${c.reward * m}, penalti ${c.penalty * m}`}>
                      <div className="up">
                        +{fmt(c.reward)} → +{fmt(c.reward * m)}
                      </div>
                      <div className="down">
                        −{fmt(c.penalty)} → −{fmt(c.penalty * m)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="note center">{kawChoice ? 'Kad bernyala akan digandakan — ganjaran dan penalti.' : 'Tekan satu kad untuk KAW-KAW, atau main selamat.'}</p>
          <div className="kaw-actions">
            <button className="btn btn-green" onClick={() => submitFinal(null)}>
              <Icon name="shield" /> MAIN SELAMAT
            </button>
            <button className="btn btn-kaw" disabled={!kawChoice} onClick={() => submitFinal(kawChoice)}>
              <Icon name="flame" /> KAW-KAW
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
