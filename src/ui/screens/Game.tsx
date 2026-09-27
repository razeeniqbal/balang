import { useEffect, useMemo, useRef, useState } from 'react';
import type { MatchClient } from '../../engine/client';
import { chipImage, food, foodImage } from '../../engine/foods';
import type { GameView, PredictionCard, TurnTimer } from '../../engine/types';
import { TIMING } from '../../net/host';
import { Card, type CardState } from '../components/Card';
import { Logo, Modal, fmt } from '../components/common';
import { Icon } from '../components/Icon';
import { Jar } from '../components/Jar';
import { Composition, History, Players, TopBar } from '../components/Panels';
import { useSettings } from '../settings';
import { PHONE, useMedia } from '../useMedia';
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

/** Local countdown from the host's "ms left" snapshot (device clocks are never compared). */
function useCountdown(timer: TurnTimer | null) {
  const end = useMemo(() => (timer ? Date.now() + timer.endsIn : 0), [timer]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);
  if (!timer) return null;
  const left = Math.max(0, end - now);
  return { kind: timer.kind, secs: Math.ceil(left / 1000), pct: Math.min(1, left / timer.total) };
}

type Countdown = ReturnType<typeof useCountdown>;

function TimerBar({ c, label }: { c: NonNullable<Countdown>; label: string }) {
  const low = c.secs <= 5;
  return (
    <div className={`timer ${low ? 'low' : ''}`} role="timer" aria-label={`${label}: ${c.secs} saat lagi`}>
      <span>{label}</span>
      <div className="timer-bar" aria-hidden>
        <i style={{ width: `${c.pct * 100}%` }} />
      </div>
      <b>{c.secs}s</b>
    </div>
  );
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
  const phone = useMedia(PHONE);

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
    const t2 = setTimeout(() => sfx.draw(), revealMs * 0.25);
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
  const [detailId, setDetailId] = useState<string | null>(null);
  const decisionKey = `${view.round}:${view.phase}:${view.drawIndex}`;
  useEffect(() => {
    setSelected([]);
    setKawOpen(false);
    setKawChoice(null);
    setDetailId(null);
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

  const countdown = useCountdown(view.timer);
  const myClock = countdown && ((countdown.kind === 'draw' && myTurn) || (countdown.kind === 'decide' && iMustDecide));
  const lastTick = useRef(0);
  useEffect(() => {
    if (myClock && countdown && countdown.secs <= 5 && countdown.secs > 0 && countdown.secs !== lastTick.current) {
      lastTick.current = countdown.secs;
      sfx.select();
    }
  }, [myClock, countdown]);
  const decideClock = countdown?.kind === 'decide' && !revealing ? countdown : null;

  // Phones: bring whatever needs the player's attention on screen.
  const actionRef = useRef<HTMLElement>(null);
  const kacauRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phone || !matchMedia('(max-width: 900px)').matches) return;
    const el = iMustDecide ? actionRef.current : myTurn && !revealing ? kacauRef.current : null;
    if (!el) return;
    // When deciding, the cards below the action panel must be visible too.
    const target = iMustDecide ? (el.parentElement ?? el) : el;
    const r = target.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ behavior: 'smooth', block: iMustDecide ? 'start' : 'center' });
  }, [phone, iMustDecide, myTurn, revealing]);

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
  const clock = decideClock && <TimerBar c={decideClock} label={iMustDecide ? 'Masa anda' : 'Masa'} />;
  if (discarding) {
    action = (
      <>
        {clock}
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
        {clock}
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
      <>
        {clock}
        <p className="action-lead">
          <span className="dots" aria-hidden /> Menunggu {waitingOn.map((p) => p.name).join(', ')}…
        </p>
      </>
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

  const overlays = (
    <>
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
          <p className="banner-sub">Gandakan risiko, gandakan ganjaran. Atau main selamat.</p>
          {decideClock && (
            <div className="modal-timer">
              <TimerBar c={decideClock} label="Masa anda" />
            </div>
          )}
          <div className="kaw-grid">
            {keptCards.map((c) => {
              const m = view.config.kawkawMultiplier;
              const on = kawChoice === c.id;
              const known = view.handOutcomes[c.id] !== 'open';
              return (
                <div key={c.id} className="kaw-option">
                  {phone ? (
                    <div className="ph-card">
                      <Card card={c} kawkaw={on} multiplier={m} settled={view.handOutcomes[c.id]} state={on ? 'keep' : 'default'} disabled={known} onClick={() => setKawChoice(on ? null : c.id)} />
                    </div>
                  ) : (
                    <Card card={c} kawkaw={on} multiplier={m} settled={view.handOutcomes[c.id]} state={on ? 'keep' : 'default'} disabled={known} onClick={() => setKawChoice(on ? null : c.id)} />
                  )}
                  {known ? (
                    <div className="kaw-preview off">Dah pasti, tak boleh KAW-KAW</div>
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
          <p className="note center">{kawChoice ? 'Ganjaran dan penalti kad bernyala akan digandakan.' : 'Tekan satu kad untuk KAW-KAW, atau main selamat.'}</p>
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
    </>
  );

  const tools = (
    <>
      <ReactionMenu
        onSend={(text) => {
          sfx.pop();
          match.act({ type: 'react', text });
        }}
      />
      <button className="icon-btn" onClick={onSettings} aria-label="Tetapan">
        <Icon name="gear" />
      </button>
    </>
  );

  const detail = detailId ? view.hand.find((c) => c.id === detailId) : undefined;

  if (phone) {
    const left = Object.values(view.remaining).reduce((a, b) => a + b, 0);
    let listHint: string;
    if (discarding) listHint = `Pilih ${need} untuk dibuang · ${selected.length}/${need}`;
    else if (finalising) listHint = `Pilih ${need} untuk dikunci · ${selected.length}/${need}`;
    else if (view.locked) listHint = 'Dikunci';
    else if (nm) listHint = `${Math.max(toMilestone, 0)} cabutan lagi · ${nm.lock ? `kunci ${nm.keep}` : `buang ${view.hand.length - nm.keep}`}`;
    else listHint = '';

    // One button, with the turn timer drawn along its bottom edge.
    const timed = (c: Countdown | null | undefined) =>
      c ? { style: { ['--pct' as string]: `${c.pct * 100}%` } as React.CSSProperties, secs: <span className={`ph-secs ${c.secs <= 5 ? 'low' : ''}`}>{c.secs}s</span> } : { style: undefined, secs: null };
    let controls;
    if (discarding) {
      const t = timed(decideClock);
      controls = (
        <button className={`btn btn-red ph-btn ${decideClock ? 'has-timer' : ''}`} style={t.style} disabled={selected.length !== need} onClick={confirmDiscard}>
          <Icon name="trash" /> BUANG {selected.length}/{need} {t.secs}
        </button>
      );
    } else if (finalising) {
      const t = timed(decideClock);
      controls = (
        <button className={`btn btn-green ph-btn ${decideClock ? 'has-timer' : ''}`} style={t.style} disabled={selected.length !== need} onClick={() => setKawOpen(true)}>
          <Icon name="lock" /> KUNCI {selected.length}/{need} {t.secs}
        </button>
      );
    } else if (view.phase === 'DRAW_PHASE') {
      const c = countdown?.kind === 'draw' && !revealing ? countdown : null;
      const t = timed(c);
      controls = (
        <button className={`btn btn-kacau ph-btn ${myTurn ? 'is-turn' : ''} ${c ? 'has-timer' : ''}`} style={t.style} disabled={!myTurn || !!revealing} onClick={draw}>
          {myTurn ? 'KACAU' : `Giliran ${drawerName}`} {t.secs}
        </button>
      );
    } else if (inDecision && !revealing) {
      const t = timed(decideClock);
      controls = (
        <p className={`ph-note ${decideClock ? 'has-timer' : ''}`} style={t.style}>
          <span className="dots" aria-hidden /> Menunggu {waitingOn.map((p) => p.name).join(', ')} {t.secs}
        </p>
      );
    } else {
      controls = <p className="ph-note">{view.locked ? `Dikunci. ${view.config.draws - view.drawIndex} cabutan lagi.` : ' '}</p>;
    }

    return (
      <main className="phone">
        <header className="ph-top">
          <div className="ph-logo">
            <Logo tagline={false} />
          </div>
          <div className="ph-round" aria-label={`Pusingan ${view.round} daripada ${view.config.rounds}, cabutan ${view.drawIndex} daripada ${view.config.draws}, ${left} token tinggal`}>
            <b className="display">
              PUSINGAN {view.round}/{view.config.rounds}
            </b>
            <span>
              Cabutan <b>{view.drawIndex}</b>/{view.config.draws} · {left} tinggal
            </span>
          </div>
          <div className="ph-tools">{tools}</div>
        </header>

        <Players view={view} reactions={bubbles} />

        <section className="ph-stage">
          <div className="ph-jar">
            <Jar
              roundKey={`r${view.round}`}
              foods={view.foods}
              startCounts={view.startCounts}
              remaining={view.remaining}
              shaking={shaking}
              canDraw={myTurn && !revealing}
              onDraw={draw}
            />
          </div>
          <ul className="ph-counts" aria-label="Isi balang sekarang">
            {view.foods.map((f) => (
              <li key={f} className={view.remaining[f] === 0 ? 'zero' : ''} aria-label={`${food(f).name}: ${view.remaining[f]} tinggal daripada ${view.startCounts[f]}`}>
                <img src={chipImage(f)} alt="" />
                <b>{view.remaining[f]}</b>
                <i style={{ ['--w' as string]: `${(view.remaining[f] / view.startCounts[f]) * 100}%`, ['--c' as string]: food(f).color }} />
                <small>keluar {view.startCounts[f] - view.remaining[f]}</small>
              </li>
            ))}
          </ul>
        </section>

        <History view={view} />

        <section className={`ph-hand ${discarding ? 'alert-red' : finalising ? 'alert-gold' : ''}`} aria-label="Kad ramalan anda">
          <div className="ph-hand-head">
            <h2 className="panel-title">KAD ANDA · {view.hand.length}</h2>
            {listHint && <span className="ph-hint">{listHint}</span>}
          </div>
          <div className="ph-strip">
            {view.hand.map((c) => (
              <div key={c.id} className="ph-card">
                <Card
                  card={c}
                  state={cardState(c)}
                  kawkaw={view.kawkawCardId === c.id}
                  multiplier={view.config.kawkawMultiplier}
                  settled={view.handOutcomes[c.id]}
                  onClick={() => {
                    // Deciding: a tap selects. Otherwise a tap opens the full card.
                    if (discarding || finalising) toggle(c.id);
                    else {
                      sfx.pop();
                      setDetailId(c.id);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <footer className="ph-controls">{controls}</footer>
        {detail && (
          <Modal label="Butiran kad" onClose={() => setDetailId(null)}>
            <div className="card-detail">
              <Card
                card={detail}
                state={cardState(detail)}
                kawkaw={view.kawkawCardId === detail.id}
                multiplier={view.config.kawkawMultiplier}
                settled={view.handOutcomes[detail.id]}
              />
              {view.handOutcomes[detail.id] !== 'open' && (
                <p className="note center">
                  {view.handOutcomes[detail.id] === 'true' ? 'Kad ini sudah pasti betul.' : 'Kad ini sudah pasti salah.'}
                </p>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailId(null)}>
                Tutup
              </button>
            </div>
          </Modal>
        )}
        {overlays}
      </main>
    );
  }

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
        />
        {view.phase === 'DRAW_PHASE' && (
          <div className="kacau-wrap" ref={kacauRef}>
            <button className={`btn btn-kacau ${myTurn ? 'is-turn' : ''}`} disabled={!myTurn || !!revealing} onClick={draw}>
              {myTurn ? (
                <span className="btn-stack center">
                  KACAU
                  <small>Giliran anda untuk ambil token</small>
                </span>
              ) : (
                <span className="btn-stack center">
                  Giliran {drawerName}
                  <small>sedang mengacau…</small>
                </span>
              )}
            </button>
            {countdown?.kind === 'draw' && !revealing && <TimerBar c={countdown} label={myTurn ? 'Masa anda' : 'Masa'} />}
          </div>
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
        <section ref={actionRef} className={`panel action-panel ${discarding ? 'alert-red' : finalising ? 'alert-gold' : ''}`} aria-live="polite">
          {action}
        </section>
      </div>

      {overlays}
    </main>
  );
}
