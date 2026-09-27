import { useEffect, useMemo, useState } from 'react';
import { chipImage, food } from '../../engine/foods';
import type { MatchClient } from '../../engine/client';
import { cardTitle } from '../../engine/predictions';
import { ranking, statsFor } from '../../engine/stats';
import type { GameView, ScoreEvent } from '../../engine/types';
import { Card } from '../components/Card';
import { Avatar, Confetti, Logo, fmt, signed } from '../components/common';
import { Icon } from '../components/Icon';
import { renderShareCard } from '../share';
import { sfx } from '../sfx';

function Mini({ e }: { e: ScoreEvent }) {
  return (
    <span className={`mini ${e.correct ? 'ok' : 'bad'}`} title={cardTitle(e.card)}>
      <img src={chipImage(e.card.a)} alt="" />
      {e.correct ? '✓ BETUL' : '✗ SALAH'}
      {e.kawkaw && <Icon name="flame" size={13} />}
      <span className="sr-only">
        {cardTitle(e.card)} {food(e.card.a).name}
      </span>
    </span>
  );
}

export function RoundResults({ view, match }: { view: GameView; match: MatchClient }) {
  const mine = view.lastRoundEvents.filter((e) => e.playerId === view.me);
  const myDelta = mine.reduce((s, e) => s + e.delta, 0);
  const isHost = match.isHostDevice;
  const last = view.round >= view.config.rounds;
  const ranked = ranking(view.players, view.scores);

  useEffect(() => {
    const t = setTimeout(() => (myDelta >= 0 ? sfx.correct() : sfx.wrong()), 250);
    return () => clearTimeout(t);
  }, [myDelta]);

  return (
    <main className="results">
      <div className="panel results-card">
        <h1 className="banner-title">KEPUTUSAN PUSINGAN {view.round}</h1>

        <div className="res-mine">
          {mine.map((e) => (
            <Card key={e.card.id} card={e.card} state={e.correct ? 'correct' : 'wrong'} kawkaw={e.kawkaw} multiplier={view.config.kawkawMultiplier} />
          ))}
        </div>
        <div className="res-total" role="status">
          Pusingan ini: <span className={myDelta >= 0 ? 'pos' : 'neg'}>{signed(myDelta)}</span>
        </div>

        <div>
          <h2 className="panel-title" style={{ textAlign: 'center', marginBottom: 8 }}>
            15 TOKEN YANG KELUAR
          </h2>
          <div className="seq">
            {view.drawn.map((f, i) => (
              <img key={i} src={chipImage(f)} alt={`${i + 1}. ${food(f).name}`} title={`${i + 1}. ${food(f).name}`} />
            ))}
          </div>
        </div>

        <table className="res-table">
          <caption className="sr-only">Kedudukan selepas pusingan {view.round}</caption>
          <tbody>
            {ranked.map((p, i) => {
              const ev = view.lastRoundEvents.filter((e) => e.playerId === p.id);
              const d = ev.reduce((s, e) => s + e.delta, 0);
              return (
                <tr key={p.id} className={p.id === view.me ? 'me' : ''}>
                  <td>{i + 1}</td>
                  <td>
                    <div className="res-who">
                      <Avatar id={p.avatar} name={p.name} />
                      {p.name}
                    </div>
                  </td>
                  <td>
                    <div className="res-cards">
                      {ev.map((e) => (
                        <Mini key={e.card.id} e={e} />
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`delta ${d >= 0 ? 'pos' : 'neg'}`} style={{ fontSize: 15, marginRight: 10 }}>
                      {signed(d)}
                    </span>
                    {fmt(view.scores[p.id])}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="results-actions">
          {isHost ? (
            <button className="btn" onClick={() => match.act({ type: 'next' })}>
              {last ? 'LIHAT KEPUTUSAN AKHIR' : `PUSINGAN ${view.round + 1} →`}
            </button>
          ) : (
            <p className="phase-hint">Menunggu hos teruskan…</p>
          )}
        </div>
      </div>
    </main>
  );
}

export function FinalResults({ view, match, onExit }: { view: GameView; match: MatchClient; onExit: () => void }) {
  const ranked = ranking(view.players, view.scores);
  const me = view.players.find((p) => p.id === view.me)!;
  const myPos = ranked.findIndex((p) => p.id === view.me) + 1;
  const stats = useMemo(() => statsFor(view.events, view.me), [view.events, view.me]);
  const [share, setShare] = useState<{ url: string; blob: Blob } | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => (myPos === 1 ? sfx.win() : sfx.correct()), 300);
    return () => clearTimeout(t);
  }, [myPos]);

  useEffect(() => () => {
    if (share) URL.revokeObjectURL(share.url);
  }, [share]);

  const makeShare = async () => {
    setSharing(true);
    try {
      const blob = await renderShareCard({ player: me, position: myPos, players: view.players.length, score: view.scores[me.id], stats, foods: view.foods });
      setShare({ blob, url: URL.createObjectURL(blob) });
    } finally {
      setSharing(false);
    }
  };

  const sendShare = async () => {
    if (!share) return;
    const file = new File([share.blob], 'balang-keputusan.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'BALANG', text: `Saya dapat tempat #${myPos} dalam BALANG! Agak. Risiko. Menang.` });
        return;
      } catch {
        /* user cancelled, so fall through to download */
      }
    }
    const a = document.createElement('a');
    a.href = share.url;
    a.download = 'balang-keputusan.png';
    a.click();
  };

  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  const isHost = match.isHostDevice;

  return (
    <main className="results">
      {myPos === 1 && <Confetti />}
      <div style={{ ['--logo-size' as string]: '48px' }}>
        <Logo />
      </div>
      <div className="panel results-card">
        <h1 className="banner-title">{myPos === 1 ? 'JUARA!' : 'KEPUTUSAN AKHIR'}</h1>

        <div className="podium" aria-label="Tiga teratas">
          {podium.map((p) => {
            const pos = ranked.indexOf(p) + 1;
            return (
              <div key={p.id} className={`podium-step p${pos}`}>
                {pos === 1 && (
                  <span className="juara-crown" aria-hidden>
                    <Icon name="crown" size={40} />
                  </span>
                )}
                <Avatar id={p.avatar} name={p.name} />
                <span className="pname">{p.name}</span>
                <span className="pscore">{fmt(view.scores[p.id])}</span>
                <div className="block">{pos}</div>
              </div>
            );
          })}
        </div>

        <table className="res-table">
          <caption className="panel-title" style={{ textAlign: 'left', marginBottom: 4 }}>
            KEDUDUKAN
          </caption>
          <tbody>
            {ranked.map((p, i) => {
              const s = statsFor(view.events, p.id);
              return (
                <tr key={p.id} className={p.id === view.me ? 'me' : ''}>
                  <td>{i + 1}</td>
                  <td>
                    <div className="res-who">
                      <Avatar id={p.avatar} name={p.name} />
                      {p.name}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 700 }}>
                    {s.correct}/{s.total} betul · KAW-KAW {s.kawkawWon}/{s.kawkawTried}
                  </td>
                  <td>{fmt(view.scores[p.id])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div>
          <h2 className="panel-title" style={{ marginBottom: 8 }}>
            STATISTIK ANDA
          </h2>
          <div className="stats-grid">
            <div className="stat">
              <span>Ketepatan</span>
              <b>{Math.round(stats.accuracy * 100)}%</b>
              <small>
                {stats.correct} daripada {stats.total} ramalan
              </small>
            </div>
            <div className="stat">
              <span>Ramalan terbaik</span>
              <b>{stats.best ? signed(stats.best.delta) : 'Tiada'}</b>
              <small>{stats.best ? `${cardTitle(stats.best.card)} · ${food(stats.best.card.a).name}` : 'Tiada yang betul'}</small>
            </div>
            <div className="stat">
              <span>Terlepas paling teruk</span>
              <b>{stats.worst ? signed(stats.worst.delta) : 'Tiada'}</b>
              <small>{stats.worst ? `${cardTitle(stats.worst.card)} · ${food(stats.worst.card.a).name}` : 'Tiada yang salah!'}</small>
            </div>
            <div className="stat">
              <span>KAW-KAW</span>
              <b>
                {stats.kawkawWon}/{stats.kawkawTried}
              </b>
              <small>berjaya</small>
            </div>
            <div className="stat">
              <span>Rentetan terpanjang</span>
              <b>{stats.longestStreak}</b>
              <small>betul berturut-turut</small>
            </div>
          </div>
        </div>

        {share && <img className="share-preview" src={share.url} alt="Kad keputusan BALANG anda" />}

        <div className="results-actions">
          {isHost ? (
            <button className="btn" onClick={() => match.act({ type: 'again' })}>
              MAIN LAGI
            </button>
          ) : (
            <p className="phase-hint">Hos boleh mulakan “Main Lagi”.</p>
          )}
          {share ? (
            <button className="btn btn-green" onClick={sendShare}>
              KONGSI / SIMPAN
            </button>
          ) : (
            <button className="btn btn-green" onClick={makeShare} disabled={sharing}>
              {sharing ? 'Menyediakan…' : 'KONGSI KEPUTUSAN'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onExit}>
            Menu Utama
          </button>
        </div>
      </div>
    </main>
  );
}
