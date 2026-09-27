import { useState } from 'react';
import { normaliseCode } from '../../engine/client';
import { foodImage } from '../../engine/foods';
import { AVATARS } from '../../net/host';
import { Logo, Modal, avatarSrc } from '../components/common';
import { Icon } from '../components/Icon';
import { Tutorial } from '../components/Tutorial';

const KEY = 'balang.profile';

/** Picker order: two rows of six, matching ring colours stacked in each column. */
const PICKER_ROWS = [
  ['avatar-01', 'avatar-02', 'avatar-03', 'avatar-04', 'avatar-05', 'avatar-06'], // green yellow red pink teal orange
  ['avatar-07', 'avatar-09', 'avatar-11', 'avatar-10', 'avatar-08', 'avatar-12'], // green yellow red pink blue purple
].flat();

function loadProfile(): { name: string; avatar: string } {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '');
    if (p?.name && AVATARS.includes(p.avatar)) return p;
  } catch {
    /* first visit or storage blocked */
  }
  return { name: '', avatar: AVATARS[0] };
}

export type StartOptions = { kind: 'host'; name: string; avatar: string } | { kind: 'join'; name: string; avatar: string; code: string };

export function Home({ onStart, inviteCode }: { onStart: (o: StartOptions) => void; inviteCode: string | null }) {
  const [profile] = useState(loadProfile);
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [joining, setJoining] = useState(!!inviteCode);
  const [code, setCode] = useState(inviteCode?.replace('MY-', '') ?? '');
  const [help, setHelp] = useState(false);
  const [error, setError] = useState('');

  const finalName = () => {
    const n = name.trim() || 'Pemain';
    try {
      localStorage.setItem(KEY, JSON.stringify({ name: n, avatar }));
    } catch {
      /* ignore */
    }
    return n;
  };

  const join = () => {
    const c = normaliseCode(code);
    if (!c) {
      setError('Masukkan 4 digit kod bilik, contoh MY-4821.');
      return;
    }
    onStart({ kind: 'join', name: finalName(), avatar, code: c });
  };

  return (
    <main className="home">
      <div className="home-card">
        <div className="home-hero">
          <Logo />
          <div className="home-foods" aria-hidden>
            {['onde-onde', 'kuih-lapis', 'muruku', 'kuih-bahulu', 'dodol'].map((f, i) => (
              <img key={f} src={foodImage(f)} alt="" style={{ transform: `rotate(${(i - 2) * 8}deg) translateY(${Math.abs(i - 2) * 5}px)` }} />
            ))}
          </div>
        </div>

        <section className="panel home-panel" aria-label="Profil pemain">
          <div className="profile-row">
            <img className="avatar profile-avatar" src={avatarSrc(avatar)} alt="" />
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="name">Nama anda</label>
              <input id="name" value={name} maxLength={14} placeholder="Contoh: Razeen" onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
            </div>
          </div>
          <div className="avatar-pick" role="radiogroup" aria-label="Pilih avatar">
            {PICKER_ROWS.map((a, i) => (
              <button type="button" key={a} role="radio" aria-checked={avatar === a} aria-label={`Avatar ${i + 1}`} onClick={() => setAvatar(a)}>
                <img src={avatarSrc(a)} alt="" />
              </button>
            ))}
          </div>

          {!joining ? (
            <div className="home-actions">
              <button className="btn" onClick={() => onStart({ kind: 'host', name: finalName(), avatar })}>
                <Icon name="plus" /> BUAT BILIK
              </button>
              <button className="btn btn-green" onClick={() => setJoining(true)}>
                <Icon name="users" /> SERTAI BILIK
              </button>
            </div>
          ) : (
            <form
              className="join-box"
              onSubmit={(e) => {
                e.preventDefault();
                join();
              }}
            >
              <label htmlFor="code">Kod bilik daripada hos</label>
              <div className="code-input">
                <span>MY-</span>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0000"
                  maxLength={4}
                  value={code}
                  onChange={(e) => {
                    setError('');
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  autoFocus
                />
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="home-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setJoining(false)}>
                  <Icon name="back" /> Balik
                </button>
                <button type="submit" className="btn btn-green" disabled={code.length !== 4}>
                  SERTAI
                </button>
              </div>
            </form>
          )}
        </section>

        <button className="btn btn-ghost btn-sm how-btn" onClick={() => setHelp(true)}>
          <Icon name="help" size={18} /> Cara Main
        </button>
      </div>

      {help && (
        <Modal label="Cara main" onClose={() => setHelp(false)}>
          <Tutorial onDone={() => setHelp(false)} />
        </Modal>
      )}
    </main>
  );
}
