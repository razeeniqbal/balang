import { food, foodImage } from '../../engine/foods';
import type { MatchClient } from '../../engine/client';
import type { GameView } from '../../engine/types';
import { Card, CardRow } from '../components/Card';
import { PHONE, useMedia } from '../useMedia';
import { sfx } from '../sfx';

export function RoundReveal({ view, match }: { view: GameView; match: MatchClient }) {
  const isHost = match.isHostDevice;
  const phone = useMedia(PHONE);
  const total = Object.values(view.startCounts).reduce((a, b) => a + b, 0);
  return (
    <main className="reveal-screen">
      <div className="panel reveal-card">
        <h1 className="banner-title">ISI BALANG</h1>
        <p className="banner-sub">
          Pusingan {view.round}/{view.config.rounds} · {total} token · {view.config.draws} cabutan
        </p>
        <ul className="isi-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {view.foods.map((f, i) => (
            <li key={f} className="isi-item" style={{ animationDelay: `${i * 90}ms` }}>
              <img src={foodImage(f)} alt="" />
              <b>×{view.startCounts[f]}</b>
              <span>{food(f).name}</span>
            </li>
          ))}
        </ul>
        <section style={{ width: '100%' }} aria-label="Kad ramalan anda">
          <h2 className="panel-title" style={{ textAlign: 'center' }}>
            KAD RAMALAN RAHSIA ANDA · {view.hand.length}
          </h2>
          {phone ? (
            <div className="reveal-rows">
              {view.hand.map((c) => (
                <CardRow key={c.id} card={c} />
              ))}
            </div>
          ) : (
            <div className="cards" style={{ justifyContent: 'safe center' }}>
              {view.hand.map((c) => (
                <Card key={c.id} card={c} />
              ))}
            </div>
          )}
        </section>
        <p className="note" style={{ textAlign: 'center', maxWidth: 560 }}>
          Semua pemain nampak isi balang yang sama, tapi kad masing-masing rahsia. Kad yang susah berlaku = ganjaran besar.
        </p>
        {isHost ? (
          <button
            className="btn btn-kacau"
            onClick={() => {
              sfx.shake();
              match.act({ type: 'beginDraws' });
            }}
          >
            KACAU BALANG
          </button>
        ) : (
          <p className="phase-hint">Menunggu hos memulakan pusingan…</p>
        )}
      </div>
    </main>
  );
}
