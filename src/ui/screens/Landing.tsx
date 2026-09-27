import type { ReactNode } from 'react';
import { CLASSIC } from '../../engine/config';
import { FOOD_LIBRARY, foodImage } from '../../engine/foods';
import type { PredictionCard } from '../../engine/types';
import { Card } from '../components/Card';
import { Logo } from '../components/common';
import { Icon, type IconName } from '../components/Icon';
import { Link } from '../router';

const HERO_CARDS: PredictionCard[] = [
  { id: 'h1', kind: 'SIAPA_DULU', a: 'onde-onde', b: 'kuih-lapis', reward: 350, penalty: 100 },
  { id: 'h2', kind: 'LAST_SEKALI', a: 'curry-puff', reward: 1000, penalty: 300 },
  { id: 'h3', kind: 'DOUBLE', a: 'kuih-bahulu', reward: 500, penalty: 150 },
];

/** A fixed, well-mixed jar for the hero (same every visit). */
const JAR_MIX = [0, 3, 1, 4, 2, 0, 2, 4, 1, 3, 3, 0, 4, 2, 1, 1, 4, 0, 3, 2].map((k) => FOOD_LIBRARY[k].id);

const STEPS: { icon: IconName; title: string; text: ReactNode }[] = [
  {
    icon: 'help',
    title: 'Lihat isi balang',
    text: (
      <>
        {CLASSIC.tokensPerRound} token daripada {CLASSIC.foodsPerRound} jenis kuih. Semua orang tahu kiraannya, tiada siapa tahu urutannya.
      </>
    ),
  },
  { icon: 'users', title: 'Agak dengan 6 kad', text: 'Setiap pemain dapat kad ramalan rahsia. Makin susah berlaku, makin besar ganjarannya.' },
  {
    icon: 'trash',
    title: 'Kacau & buang',
    text: (
      <>
        {CLASSIC.draws} token dicabut bergilir. Setiap beberapa cabutan, buang kad yang makin tak mungkin.
      </>
    ),
  },
  { icon: 'flame', title: 'Kunci & KAW-KAW', text: 'Kunci 2 kad terakhir. Berani? KAW-KAW satu kad untuk gandakan ganjaran dan penalti.' },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'users', title: 'Main dengan kawan', text: '2 hingga 6 pemain. Kongsi kod bilik, pautan atau QR. Tiada akaun, tiada pendaftaran.' },
  { icon: 'bot', title: 'Lawan komputer', text: 'Tak cukup orang? Tambah lawan komputer yang berfikir berdasarkan apa yang tinggal dalam balang.' },
  { icon: 'flame', title: 'KAW-KAW', text: 'Gandakan risiko, gandakan ganjaran. Pilihan sahaja, tak wajib untuk menang.' },
  { icon: 'lock', title: 'Adil & rahsia', text: 'Urutan cabutan dan kad setiap pemain disimpan oleh hos. Tiada siapa boleh intai.' },
  { icon: 'next', title: 'Laju', text: 'Satu perlawanan 3 pusingan siap dalam 10 hingga 15 minit. Had masa setiap giliran boleh dipasang.' },
  { icon: 'share', title: 'Telefon atau komputer', text: 'Terus main dalam pelayar. Tiada aplikasi untuk dipasang.' },
];

export function Landing() {
  return (
    <div className="table site">
      <header className="site-nav">
        <Link to="/" className="site-brand" aria-label="BALANG laman utama">
          <Logo tagline={false} />
        </Link>
        <nav>
          <Link to="/docs">Dokumentasi</Link>
          <Link to="/docs#kad">Kad</Link>
          <Link to="/main" className="btn btn-sm">
            Main
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="kicker">Permainan ramalan parti Malaysia</span>
            <h1 className="hero-title">
              Agak.
              <br />
              Risiko.
              <br />
              <span>Menang.</span>
            </h1>
            <p className="hero-lead">
              Kuih dalam balang, kad ramalan di tangan, kawan di sekeliling meja. Perhatikan apa yang keluar, buang ramalan yang makin tipis, dan berani KAW-KAW bila yakin.
            </p>
            <div className="hero-cta">
              <Link to="/main" className="btn">
                MAIN SEKARANG <Icon name="next" />
              </Link>
              <Link to="/docs" className="btn btn-ghost">
                Baca peraturan
              </Link>
            </div>
            <p className="hero-meta">
              2 hingga 6 pemain · 10 hingga 15 minit · Percuma, terus dalam pelayar
            </p>
          </div>

          <div className="hero-art" aria-hidden>
            <div className="hero-jar">
              <img className="hero-lid" src="/assets/jar/lid.png" alt="" />
              <div className="hero-glass">
                {JAR_MIX.map((f, i) => (
                  <img key={i} src={foodImage(f)} alt="" style={{ ['--r' as string]: `${((i * 53) % 70) - 35}deg` }} />
                ))}
              </div>
            </div>
            <div className="hero-cards">
              {HERO_CARDS.map((c) => (
                <Card key={c.id} card={c} />
              ))}
            </div>
          </div>
        </section>

        <section className="site-section" id="cara">
          <h2 className="section-title">Satu pusingan, empat langkah</h2>
          <ol className="steps4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step-n">{i + 1}</span>
                <Icon name={s.icon} size={26} />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="center">
            <Link to="/docs" className="text-link">
              Peraturan penuh di dokumentasi <Icon name="next" size={16} />
            </Link>
          </p>
        </section>

        <section className="site-section">
          <h2 className="section-title">Kenapa BALANG?</h2>
          <div className="features">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature">
                <span className="feature-icon">
                  <Icon name={f.icon} size={24} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="site-section">
          <h2 className="section-title">Kuih dalam balang</h2>
          <p className="section-lead">Setiap pusingan memilih 5 daripada {FOOD_LIBRARY.length} kuih secara rawak, jadi setiap perlawanan berbeza.</p>
          <ul className="kuih-grid">
            {FOOD_LIBRARY.map((f) => (
              <li key={f.id}>
                <img src={foodImage(f.id)} alt="" />
                <span>{f.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cta-band">
          <h2>Siapa paling pandai agak?</h2>
          <p>Buat bilik, kongsi kod, dan mula main dalam beberapa saat.</p>
          <Link to="/main" className="btn">
            BUAT BILIK SEKARANG
          </Link>
        </section>
      </main>

      <footer className="site-foot">
        <span>BALANG · Agak. Risiko. Menang.</span>
        <nav>
          <Link to="/main">Main</Link>
          <Link to="/docs">Dokumentasi</Link>
        </nav>
        <span className="muted">Mata permainan sahaja. Bukan perjudian, tiada wang sebenar.</span>
      </footer>
    </div>
  );
}
