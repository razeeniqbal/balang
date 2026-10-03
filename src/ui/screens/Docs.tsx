import { useEffect, useState, type ReactNode } from 'react';
import { CLASSIC, QUICK, TIMERS } from '../../engine/config';
import { FOOD_LIBRARY, chipImage } from '../../engine/foods';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../engine/game';
import type { CardKind, PredictionCard } from '../../engine/types';
import { CardRow } from '../components/Card';
import { Logo, fmt } from '../components/common';
import { Icon } from '../components/Icon';
import { Link } from '../router';

const SECTIONS = [
  ['pengenalan', 'Pengenalan'],
  ['mula', 'Mula main'],
  ['pusingan', 'Satu pusingan'],
  ['keputusan-titik', 'Titik keputusan'],
  ['kad', 'Jenis kad ramalan'],
  ['ganjaran', 'Nilai kad'],
  ['pasti', 'DAH PASTI / DAH GAGAL'],
  ['negatif', 'Kad negatif'],
  ['kawkaw', 'KAW-KAW'],
  ['masa', 'Had masa'],
  ['markah', 'Markah & statistik'],
  ['talian', 'Main dalam talian'],
  ['soalan', 'Soalan lazim'],
  ['istilah', 'Istilah'],
] as const;

const A = 'kuih-lapis';
const B = 'onde-onde';

const KINDS: { kind: CardKind; b?: boolean; n?: number; how: string; tip: string }[] = [
  { kind: 'BANYAK_LAGI', b: true, how: `Betul jika dalam ${CLASSIC.draws} cabutan, kuih pertama keluar lebih banyak kali daripada kuih kedua. Sama banyak dikira salah.`, tip: 'Bandingkan berapa banyak setiap kuih ada dalam balang pada mulanya.' },
  { kind: 'SIAPA_DULU', b: true, how: 'Betul jika kuih pertama keluar sebelum kuih kedua. Jika kuih pertama tak keluar langsung, kad ini salah.', tip: 'Cepat pasti. Sebaik salah satu keluar, keputusannya diketahui.' },
  { kind: 'AWAL_AWAL', how: 'Betul jika kuih itu keluar dalam 3 cabutan pertama.', tip: 'Keputusan diketahui selepas cabutan ke-3, sebelum anda perlu buang kad pertama.' },
  { kind: 'DOUBLE', how: `Betul jika kuih itu keluar dua kali berturut-turut, pada bila-bila masa dalam ${CLASSIC.draws} cabutan.`, tip: 'Lebih mungkin untuk kuih yang banyak dalam balang.' },
  { kind: 'DOMINAN', how: 'Betul jika kuih itu keluar paling banyak kali berbanding setiap kuih lain. Seri di tempat pertama dikira salah.', tip: 'Biasanya kuih yang paling banyak di awal pusingan.' },
  { kind: 'DUA_ATAU_KURANG', how: 'Betul jika kuih itu keluar 2 kali atau kurang (termasuk tidak keluar langsung).', tip: 'Sesuai untuk kuih yang sedikit. Salah sebaik kuih itu keluar kali ke-3.' },
  { kind: 'TEPAT', n: 3, how: 'Betul jika kuih itu keluar tepat sebanyak nombor pada kad, tidak kurang dan tidak lebih.', tip: 'Susah, sebab itu ganjarannya tinggi.' },
  { kind: 'JIRAN', b: true, how: 'Betul jika kuih kedua keluar sejurus selepas kuih pertama, sekurang-kurangnya sekali.', tip: 'Susah diramal; biasanya ganjaran besar.' },
  { kind: 'TAK_KELUAR', how: `Betul jika kuih itu tidak keluar langsung dalam ${CLASSIC.draws} cabutan.`, tip: 'Hanya munasabah untuk kuih yang sangat sedikit.' },
  { kind: 'LAST_SEKALI', how: `Betul jika cabutan ke-${CLASSIC.draws} (yang terakhir) ialah kuih itu.`, tip: 'Tiada petunjuk hingga hujung. Kad risiko tinggi.' },
  { kind: 'PALING_KURANG', n: 3, how: 'Betul jika kuih itu keluar sekurang-kurangnya sebanyak nombor pada kad.', tip: 'Boleh jadi pasti betul lebih awal jika kuih itu kerap keluar.' },
  { kind: 'MASIH_ADA', n: 2, how: 'Betul jika sekurang-kurangnya sebanyak nombor itu kuih tersebut masih dalam balang selepas cabutan terakhir.', tip: `Ingat: ${CLASSIC.tokensPerRound - CLASSIC.draws} token kekal dalam balang pada akhir pusingan.` },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="doc-section">
      <h2>
        <a href={`#${id}`} aria-hidden tabIndex={-1}>
          #
        </a>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Docs() {
  const [active, setActive] = useState<string>(SECTIONS[0][0]);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const [m1, m2, m3] = CLASSIC.milestones;
  const tiers = [...CLASSIC.rewardTiers].reverse();

  return (
    <div className="table site docs">
      <header className="site-nav">
        <Link to="/" className="site-brand" aria-label="BALANG laman utama">
          <Logo tagline={false} />
        </Link>
        <nav>
          <Link to="/" className="nav-hide-sm">
            Laman utama
          </Link>
          <Link to="/main" className="btn btn-sm">
            Main
          </Link>
        </nav>
      </header>

      <div className="doc-layout">
        <aside className={`doc-toc ${tocOpen ? 'open' : ''}`}>
          <button className="doc-toc-toggle" onClick={() => setTocOpen(!tocOpen)} aria-expanded={tocOpen}>
            Kandungan <Icon name="next" size={16} />
          </button>
          <nav aria-label="Kandungan">
            {SECTIONS.map(([id, label]) => (
              <Link key={id} to={`/docs#${id}`} className={active === id ? 'on' : ''} onClick={() => setTocOpen(false)}>
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="doc-body">
          <p className="kicker">Dokumentasi</p>
          <h1>Cara bermain BALANG</h1>
          <p className="doc-lead">Semua peraturan, jenis kad dan cara markah dikira, di satu tempat.</p>

          <Section id="pengenalan" title="Pengenalan">
            <p>
              BALANG ialah permainan ramalan untuk {MIN_PLAYERS} hingga {MAX_PLAYERS} pemain. Sebuah balang diisi token kuih. Semua pemain tahu apa yang ada di dalamnya, tetapi tiada siapa tahu urutan token akan keluar.
            </p>
            <p>
              Setiap pemain memegang kad ramalan rahsia seperti “Onde-Onde keluar dulu sebelum Kuih Lapis”. Sambil token dicabut, anda perlu membuang kad yang makin tak mungkin, meletakkan satu kad terakhir di sisi <b>negatif</b>, dan memilih sama ada mahu <b>KAW-KAW</b>. Pemain dengan mata tertinggi selepas {CLASSIC.rounds} pusingan menang.
            </p>
            <div className="callout">
              <Icon name="help" size={20} />
              <p>Anda tak perlu kira kebarangkalian. Cukup perhatikan apa yang sudah keluar dan apa yang masih tinggal dalam balang.</p>
            </div>
          </Section>

          <Section id="mula" title="Mula main">
            <ol className="doc-steps">
              <li>
                Buka <Link to="/main">halaman permainan</Link>, masukkan nama dan pilih avatar.
              </li>
              <li>
                Tekan <b>Buat Bilik</b>. Anda menjadi hos dan dapat kod bilik (contoh <code>MY-4821</code>), pautan jemputan dan kod QR.
              </li>
              <li>
                Kawan tekan <b>Sertai Bilik</b> dan masukkan kod, buka pautan, atau imbas QR. Tambah lawan komputer jika perlu.
              </li>
              <li>
                Hos pilih mod dan had masa, kemudian tekan <b>Mula Game</b>.
              </li>
            </ol>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Mod</th>
                  <th>Pusingan</th>
                  <th>Sesuai untuk</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Klasik</td>
                  <td>{CLASSIC.rounds}</td>
                  <td>Perlawanan penuh</td>
                </tr>
                <tr>
                  <td>Pantas</td>
                  <td>{QUICK.rounds}</td>
                  <td>Cuba permainan atau main sekejap</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section id="pusingan" title="Satu pusingan">
            <ol className="doc-steps">
              <li>
                <b>Isi balang.</b> Permainan memilih {CLASSIC.foodsPerRound} kuih secara rawak dan mengisi balang dengan {CLASSIC.tokensPerRound} token (setiap kuih antara {CLASSIC.minPerFood} hingga {CLASSIC.maxPerFood}). Kiraan ini ditunjuk kepada semua.
              </li>
              <li>
                <b>Kad ramalan.</b> Setiap pemain dapat {CLASSIC.cardsDealt} kad rahsia. Kad pemain lain tidak kelihatan hingga keputusan.
              </li>
              <li>
                <b>Kacau.</b> Pemain bergilir menekan <b>KACAU</b> untuk mencabut satu token. Sebanyak {CLASSIC.draws} token dicabut, dan {CLASSIC.tokensPerRound - CLASSIC.draws} kekal dalam balang.
              </li>
              <li>
                <b>Buang dan letak.</b> Pada titik tertentu semua pemain berhenti untuk membuat keputusan (lihat bawah).
              </li>
              <li>
                <b>Keputusan.</b> Selepas cabutan ke-{CLASSIC.draws}, setiap kad yang diletak diperiksa. Kad positif yang <b className="up">BETUL</b> dapat nilainya, yang salah dapat 0. Kad negatif yang <b className="down">berlaku</b> tolak nilainya, yang tak berlaku dapat 0.
              </li>
            </ol>
            <p>Panel <b>Balang Sekarang</b> sentiasa menunjukkan berapa banyak setiap kuih masih tinggal, dan jalur cabutan menunjukkan urutan token yang sudah keluar.</p>
          </Section>

          <Section id="keputusan-titik" title="Titik keputusan">
            <p>Makin banyak maklumat, makin sedikit kad yang boleh disimpan. Ini nadi permainan BALANG.</p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Bila</th>
                  <th>Tindakan</th>
                  <th>Kad tinggal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mula pusingan</td>
                  <td>Terima kad</td>
                  <td>{CLASSIC.cardsDealt}</td>
                </tr>
                <tr>
                  <td>Selepas cabutan {m1.afterDraw}</td>
                  <td>Buang {CLASSIC.cardsDealt - m1.keep} kad</td>
                  <td>{m1.keep}</td>
                </tr>
                <tr>
                  <td>Selepas cabutan {m2.afterDraw}</td>
                  <td>Buang {m1.keep - m2.keep} kad</td>
                  <td>{m2.keep}</td>
                </tr>
                <tr>
                  <td>Selepas cabutan {m3.afterDraw}</td>
                  <td>Letak {m3.keep} kad: 1 di sisi negatif, {m3.keep - 1} positif, dan pilih KAW-KAW jika mahu</td>
                  <td>{m3.keep}</td>
                </tr>
              </tbody>
            </table>
            <p>Cabutan berhenti sehingga semua pemain selesai membuat keputusan. Buang kad tidak boleh diundur.</p>
          </Section>

          <Section id="kad" title="Jenis kad ramalan">
            <p>
              Terdapat {KINDS.length} jenis kad. Contoh di bawah menggunakan Kuih Lapis dan Onde-Onde; dalam permainan, kuih dan nombornya berbeza setiap kali.
            </p>
            <div className="kind-list">
              {KINDS.map((k) => {
                const card: PredictionCard = { id: k.kind, kind: k.kind, a: A, b: k.b ? B : undefined, n: k.n, reward: 0 };
                return (
                  <div key={k.kind} className="kind">
                    <div className="kind-card">
                      <CardRow card={card} />
                    </div>
                    <p>{k.how}</p>
                    <p className="kind-tip">
                      <Icon name="help" size={14} /> {k.tip}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section id="ganjaran" title="Nilai kad">
            <p>
              Setiap kad ada satu nilai, bergantung pada betapa mungkin ia berlaku, dikira pada saat kad diagihkan berdasarkan isi balang. Kad yang hampir pasti bernilai kecil; kad yang jarang berlaku bernilai besar.
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Peluang berlaku</th>
                  <th>Nilai</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const hi = i === tiers.length - 1 ? null : tiers[i + 1].minP;
                  return (
                    <tr key={t.reward}>
                      <td>{hi === null ? `${Math.round(t.minP * 100)}% ke atas` : `${Math.round(t.minP * 100)}% hingga ${Math.round(hi * 100)}%`}</td>
                      <td className="up">{fmt(t.reward)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="muted">
              Kad yang terlalu pasti (melebihi {Math.round(CLASSIC.dealableP[1] * 100)}%) atau hampir mustahil (bawah {Math.round(CLASSIC.dealableP[0] * 100)}%) tidak akan diagihkan.
            </p>
          </Section>

          <Section id="pasti" title="DAH PASTI / DAH GAGAL">
            <p>
              Sebaik keputusan sesuatu kad tidak boleh berubah lagi, kad itu ditanda dengan cop <span className="cr-settled yes">DAH PASTI</span> (pasti betul) atau{' '}
              <span className="cr-settled no">DAH GAGAL</span> (pasti salah). Cop ini hanya muncul bila ia benar-benar pasti, bukan tekaan.
            </p>
            <p>
              Gunakan maklumat ini semasa membuat keputusan: kad DAH PASTI selamat disimpan di sisi positif, dan kad DAH GAGAL selamat diletak di sisi negatif kerana ia tidak akan menolak mata. Kad yang sudah pasti tidak boleh di-KAW-KAW.
            </p>
          </Section>

          <Section id="negatif" title="Kad negatif">
            <p>
              Di titik keputusan terakhir anda tinggal {m3.keep} kad, dan kesemuanya dinilai. Anda mesti meletakkan <b>satu</b> kad di sisi <b>negatif</b>: jika ramalan itu berlaku, anda <b className="down">hilang</b> nilainya. Jika tidak berlaku, ia dapat 0.
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Sisi positif</th>
                  <th>Sisi negatif</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ramalan berlaku</td>
                  <td className="up">+450</td>
                  <td className="down">−450</td>
                </tr>
                <tr>
                  <td>Tidak berlaku</td>
                  <td>0</td>
                  <td>0</td>
                </tr>
              </tbody>
            </table>
            <p>Pilihan yang bijak ialah kad yang anda rasa paling tidak mungkin berlaku. Tetapi kad yang jarang berlaku biasanya bernilai besar, jadi jika ia berlaku juga, kerugiannya besar.</p>
          </Section>

          <Section id="kawkaw" title="KAW-KAW">
            <p>
              Selepas memilih kad negatif, anda boleh KAW-KAW <b>satu kad positif</b>. Jika betul, nilainya didarab {CLASSIC.kawkawMultiplier}. Jika salah, anda hilang nilainya, sedangkan tanpa KAW-KAW kad yang salah hanya dapat 0.
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Biasa</th>
                  <th>KAW-KAW</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Betul</td>
                  <td className="up">+450</td>
                  <td className="up">+{fmt(450 * CLASSIC.kawkawMultiplier)}</td>
                </tr>
                <tr>
                  <td>Salah</td>
                  <td>0</td>
                  <td className="down">−450</td>
                </tr>
              </tbody>
            </table>
            <ul>
              <li>KAW-KAW adalah pilihan. Anda boleh tekan <b>Main Selamat</b>.</li>
              <li>Kad negatif tidak boleh di-KAW-KAW.</li>
              <li>Kad yang sudah DAH PASTI atau DAH GAGAL tidak boleh di-KAW-KAW.</li>
              <li>Permainan tidak akan KAW-KAW bagi pihak anda walaupun masa tamat.</li>
            </ul>
          </Section>

          <Section id="masa" title="Had masa">
            <p>Hos memilih had masa di lobi. Masa bermula selepas animasi cabutan tamat.</p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Pilihan</th>
                  <th>Untuk kacau</th>
                  <th>Untuk buang / letak</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(TIMERS) as (keyof typeof TIMERS)[]).map((k) => (
                  <tr key={k}>
                    <td>{k === 'off' ? 'Tiada' : k === 'santai' ? 'Santai' : 'Laju'}</td>
                    <td>{TIMERS[k].drawSeconds ? `${TIMERS[k].drawSeconds} saat` : 'Tiada had'}</td>
                    <td>{TIMERS[k].decideSeconds ? `${TIMERS[k].decideSeconds} saat` : 'Tiada had'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Bila masa tamat, token dicabut secara automatik, atau permainan memilih kad yang paling munasabah untuk dibuang, atau meletakkan kad yang paling tidak mungkin di sisi negatif. Avatar anda akan berkata “Masa tamat!”.</p>
          </Section>

          <Section id="markah" title="Markah & statistik">
            <p>Mata pusingan ialah nilai kad positif yang betul, tolak nilai kad negatif yang berlaku, tolak nilai kad KAW-KAW yang salah. Mata dikumpul sepanjang {CLASSIC.rounds} pusingan. Mata boleh jadi negatif.</p>
            <p>Selepas perlawanan anda nampak statistik yang dikira daripada permainan sebenar:</p>
            <ul>
              <li>
                <b>Keputusan baik:</b> peratus kad yang berakhir baik (kad positif betul, atau kad negatif yang tidak berlaku).
              </li>
              <li>
                <b>Ramalan terbaik / terlepas paling teruk:</b> kad dengan mata tertinggi dan terendah.
              </li>
              <li>
                <b>KAW-KAW:</b> berapa kali berjaya daripada berapa kali dicuba.
              </li>
              <li>
                <b>Rentetan terpanjang:</b> keputusan baik berturut-turut.
              </li>
            </ul>
            <p>Tekan <b>Kongsi Keputusan</b> untuk menjana kad keputusan bergambar yang boleh dikongsi.</p>
          </Section>

          <Section id="talian" title="Main dalam talian">
            <ul>
              <li>Pelayar hos menjadi “pengadil”. Ia menyimpan urutan cabutan dan kad semua pemain, dan hanya menghantar kepada setiap pemain apa yang dia boleh lihat.</li>
              <li>Pemain disambung terus antara peranti (peer-to-peer). Tiada akaun dan tiada pelayan permainan.</li>
              <li>Jika pemain terputus semasa permainan, lawan komputer mengambil alih gilirannya sehingga dia sambung semula menggunakan peranti yang sama.</li>
              <li>Jika hos menutup bilik atau halaman, permainan tamat untuk semua. Hos perlu kekalkan halaman terbuka.</li>
              <li>Pemain baharu hanya boleh masuk semasa di lobi.</li>
            </ul>
          </Section>

          <Section id="soalan" title="Soalan lazim">
            <details>
              <summary>Adakah ini perjudian?</summary>
              <p>Tidak. Mata hanyalah mata permainan. Tiada wang sebenar, tiada pembelian.</p>
            </details>
            <details>
              <summary>Kawan saya tak dapat sertai bilik.</summary>
              <p>Pastikan kod betul dan hos masih di lobi. Sesetengah rangkaian pejabat atau sekolah menyekat sambungan terus antara peranti; cuba data mudah alih.</p>
            </details>
            <details>
              <summary>Boleh main seorang?</summary>
              <p>Boleh. Buat bilik dan tambah lawan komputer.</p>
            </details>
            <details>
              <summary>Kenapa ada kad dengan ganjaran sangat tinggi?</summary>
              <p>Kerana peluangnya rendah. Simpan kad itu hanya jika cabutan mula menyebelahi anda.</p>
            </details>
          </Section>

          <Section id="istilah" title="Istilah">
            <dl className="glossary">
              <dt>Balang</dt>
              <dd>Bekas kaca berisi token kuih.</dd>
              <dt>Kacau</dt>
              <dd>Tindakan mencabut satu token dari balang.</dd>
              <dt>Cabutan</dt>
              <dd>Satu token yang keluar. Satu pusingan ada {CLASSIC.draws} cabutan.</dd>
              <dt>Buang Kad</dt>
              <dd>Membuang kad ramalan pada titik keputusan.</dd>
              <dt>Kad negatif</dt>
              <dd>Satu kad terakhir yang menolak mata jika ramalannya berlaku.</dd>
              <dt>Kunci Pilihan</dt>
              <dd>Memilih kad terakhir yang akan dinilai.</dd>
              <dt>KAW-KAW</dt>
              <dd>Menggandakan nilai satu kad positif, dengan risiko hilang nilainya jika salah.</dd>
              <dt>Betul / Salah</dt>
              <dd>Keputusan kad pada akhir pusingan.</dd>
            </dl>
            <ul className="kuih-mini">
              {FOOD_LIBRARY.map((f) => (
                <li key={f.id}>
                  <img src={chipImage(f.id)} alt="" />
                  {f.name}
                </li>
              ))}
            </ul>
          </Section>

          <div className="doc-end">
            <Link to="/main" className="btn">
              MAIN SEKARANG
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
