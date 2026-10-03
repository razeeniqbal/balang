import { useEffect, useState, type ReactNode } from 'react';
import { CLASSIC } from '../../engine/config';
import { chipImage, food, foodImage } from '../../engine/foods';
import type { PredictionCard } from '../../engine/types';
import { Card } from './Card';
import { Icon } from './Icon';

const EX_COUNTS: [string, number][] = [
  ['onde-onde', 7],
  ['kuih-lapis', 6],
  ['muruku', 5],
  ['dodol', 4],
  ['curry-puff', 3],
];

const EX_CARDS: PredictionCard[] = [
  { id: 't1', kind: 'BANYAK_LAGI', a: 'onde-onde', b: 'dodol', reward: 100 },
  { id: 't2', kind: 'TEPAT', a: 'muruku', n: 3, reward: 450 },
  { id: 't3', kind: 'LAST_SEKALI', a: 'curry-puff', reward: 1000 },
];

/** Discard steps derived from the real config: start, then each decision point. */
const FUNNEL = (() => {
  let prev = CLASSIC.cardsDealt;
  const steps = [{ n: prev, at: 'Mula', note: `dapat ${prev} kad` }];
  for (const m of CLASSIC.milestones) {
    steps.push({ n: m.keep, at: `Cabutan ${m.afterDraw}`, note: m.lock ? `letak ${m.keep}` : `buang ${prev - m.keep}` });
    prev = m.keep;
  }
  return steps;
})();

const EX_DRAWS = ['kuih-lapis', 'onde-onde', 'muruku', 'onde-onde', 'dodol', 'kuih-lapis'];

function Slide({ kicker, title, children, text }: { kicker: string; title: string; children: ReactNode; text: ReactNode }) {
  return (
    <div className="tut-slide">
      <div className="tut-visual">{children}</div>
      <div className="tut-copy">
        <span className="tut-kicker">{kicker}</span>
        <h3 className="tut-title">{title}</h3>
        <div className="tut-text">{text}</div>
      </div>
    </div>
  );
}

const SLIDES = [
  () => (
    <Slide
      kicker="Langkah 1"
      title="Semua orang tahu isi balang"
      text={
        <>
          <p>Setiap pusingan, balang diisi <b>25 token</b> daripada <b>5 jenis kuih</b>. Kiraan asal ditunjuk kepada semua pemain.</p>
          <p>Yang tiada siapa tahu: <b>urutan</b> token akan keluar.</p>
        </>
      }
    >
      <div className="tut-isi">
        {EX_COUNTS.map(([f, n]) => (
          <div key={f} className="tut-isi-item">
            <img src={foodImage(f)} alt="" />
            <b>×{n}</b>
            <span>{food(f).name}</span>
          </div>
        ))}
      </div>
    </Slide>
  ),
  () => (
    <Slide
      kicker="Langkah 2"
      title="Agak apa akan berlaku"
      text={
        <>
          <p>Anda dapat <b>{CLASSIC.cardsDealt} kad ramalan rahsia</b>. Setiap kad ada satu <b>nilai</b>: jika ramalan itu berlaku, anda dapat nilainya.</p>
          <p>Makin susah ramalan itu berlaku, makin besar nilainya.</p>
        </>
      }
    >
      <div className="tut-cards">
        {EX_CARDS.map((c) => (
          <Card key={c.id} card={c} />
        ))}
      </div>
      <div className="tut-scale">
        <span>Senang · kecil</span>
        <i />
        <span>Susah · besar</span>
      </div>
    </Slide>
  ),
  () => (
    <Slide
      kicker="Langkah 3"
      title="Kacau & cabut, satu demi satu"
      text={
        <>
          <p>Pemain bergilir menekan <b>KACAU</b>. <b>{CLASSIC.draws} token</b> akan keluar dan {CLASSIC.tokensPerRound - CLASSIC.draws} kekal dalam balang.</p>
          <p>Panel <b>Balang Sekarang</b> menunjukkan apa yang masih tinggal. Gunakan itu untuk menilai kad anda.</p>
          <p>Jika hos pasang <b>had masa</b> dan masa anda tamat, token dicabut atau kad dipilih secara automatik.</p>
        </>
      }
    >
      <div className="tut-draws">
        {Array.from({ length: CLASSIC.draws }, (_, i) => (
          <span key={i} className={i < EX_DRAWS.length ? 'on' : ''}>
            {i < EX_DRAWS.length ? <img src={chipImage(EX_DRAWS[i])} alt={food(EX_DRAWS[i]).name} /> : i + 1}
          </span>
        ))}
      </div>
      <div className="tut-remaining">
        {EX_COUNTS.map(([f, n]) => {
          const out = EX_DRAWS.filter((x) => x === f).length;
          return (
            <div key={f}>
              <img src={chipImage(f)} alt="" />
              <b>{n - out}</b>
              <small>/{n}</small>
            </div>
          );
        })}
      </div>
    </Slide>
  ),
  () => (
    <Slide
      kicker="Langkah 4"
      title="Buang kad yang makin tak mungkin"
      text={
        <>
          <p>Makin banyak maklumat, makin sedikit kad yang boleh disimpan.</p>
          <p>
            {FUNNEL.slice(1).map((s, i, all) => (
              <span key={s.at}>
                {i === 0 ? 'Selepas ' : i === all.length - 1 ? 'dan selepas ' : 'selepas '}
                {s.at.toLowerCase()} <b>{s.note}</b>
                {i === all.length - 1 ? ' kad terakhir.' : ', '}
              </span>
            ))}
          </p>
        </>
      }
    >
      <div className="tut-funnel">
        {FUNNEL.map((s, i) => (
          <div key={s.at} className="tut-step">
            <div className="tut-stack" aria-hidden>
              {Array.from({ length: s.n }, (_, k) => (
                <i key={k} style={{ left: `${k * 9}px` }} />
              ))}
            </div>
            <b>{s.n} kad</b>
            <span>{s.at}</span>
            <small>{s.note}</small>
            {i < FUNNEL.length - 1 && <Icon name="next" className="tut-arrow" />}
          </div>
        ))}
      </div>
      <div className="tut-stamps">
        <span className="card-settled yes" style={{ position: 'static', transform: 'rotate(-4deg)' }}>
          ✓ DAH PASTI
        </span>
        <span className="card-settled no" style={{ position: 'static', transform: 'rotate(3deg)' }}>
          ✗ DAH GAGAL
        </span>
        <small>Cop ini muncul bila keputusan kad sudah pasti.</small>
      </div>
    </Slide>
  ),
  () => (
    <Slide
      kicker="Langkah 5"
      title="Satu kad negatif, KAW-KAW atau main selamat?"
      text={
        <>
          <p>
            Di titik terakhir, letak <b>1 kad di sisi negatif</b>: jika ramalan itu berlaku, anda <b className="down">hilang</b> nilainya. Dua kad lagi kekal positif.
          </p>
          <p>
            Berani? <b>KAW-KAW</b> satu kad positif: nilainya jadi <b>dua kali ganda</b> jika betul, tetapi anda hilang nilainya jika salah. Kad yang sudah pasti tak boleh di-KAW-KAW.
          </p>
        </>
      }
    >
      <div className="tut-kaw">
        <Card card={{ ...EX_CARDS[2], id: 'n' }} negative state="negative" />
        <Card card={{ ...EX_CARDS[1], id: 'k' }} kawkaw multiplier={CLASSIC.kawkawMultiplier} state="keep" />
      </div>
    </Slide>
  ),
  () => (
    <Slide
      kicker="Langkah 6"
      title="Keputusan & JUARA"
      text={
        <>
          <p>
            Selepas cabutan ke-{CLASSIC.draws}: kad positif yang <b className="up">BETUL</b> dapat nilainya, yang salah dapat 0. Kad negatif yang <b className="down">berlaku</b> tolak nilainya, yang tak berlaku dapat 0.
          </p>
          <p>Main <b>{CLASSIC.rounds} pusingan</b>. Mata tertinggi jadi JUARA!</p>
        </>
      }
    >
      <div className="tut-score">
        <div className="mini ok">
          <img src={chipImage('muruku')} alt="" /> ✓ BETUL <b>+450</b>
        </div>
        <div className="mini">
          <img src={chipImage('onde-onde')} alt="" /> ✗ SALAH <b>0</b>
        </div>
        <div className="mini ok">
          <img src={chipImage('curry-puff')} alt="" /> ✓ NEGATIF SELAMAT <b>0</b>
        </div>
        <div className="tut-total">
          Pusingan ini: <b className="up">+450</b>
        </div>
        <div className="tut-crown">
          <Icon name="crown" size={44} />
        </div>
      </div>
    </Slide>
  ),
];

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const S = SLIDES[i];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, SLIDES.length - 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="tutorial">
      <h2 className="banner-title tut-head">CARA MAIN</h2>
      <div className="tut-body" key={i} aria-live="polite">
        <S />
      </div>
      <div className="tut-nav">
        <button className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)} disabled={i === 0}>
          <Icon name="back" size={18} /> Balik
        </button>
        <div className="tut-dots" role="tablist" aria-label="Langkah">
          {SLIDES.map((_, k) => (
            <button key={k} role="tab" aria-selected={k === i} aria-label={`Langkah ${k + 1}`} onClick={() => setI(k)} />
          ))}
        </div>
        {last ? (
          <button className="btn btn-sm" onClick={onDone}>
            Faham, jom main!
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => setI(i + 1)}>
            Seterusnya <Icon name="next" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
