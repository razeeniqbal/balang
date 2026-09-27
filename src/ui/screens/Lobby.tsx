import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { MatchClient } from '../../engine/client';
import { MODES } from '../../engine/config';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../engine/game';
import type { GameView } from '../../engine/types';
import { Avatar, Logo, Modal } from '../components/common';
import { Icon } from '../components/Icon';
import { Tutorial } from '../components/Tutorial';

export const inviteLink = (code: string) => `${location.origin}${location.pathname}?room=${code}`;

export function Lobby({ view, match, onExit }: { view: GameView; match: MatchClient; onExit: () => void }) {
  const isHost = match.isHostDevice;
  const online = match.connection === 'online';
  const link = inviteLink(view.roomCode);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [help, setHelp] = useState(false);
  const humans = view.players.filter((p) => !p.isBot).length;
  const canStart = view.players.length >= MIN_PLAYERS;
  const mode = view.config.rounds === MODES.quick.rounds ? 'quick' : 'classic';

  useEffect(() => {
    if (!isHost || !online) return;
    QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: '#0e3b28', light: '#fffaf0' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [isHost, online, link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the link is visible to copy by hand */
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'BALANG', text: `Jom main BALANG! Kod bilik: ${view.roomCode}`, url: link });
    } catch {
      copy();
    }
  };

  return (
    <main className="lobby">
      <div className="lobby-grid">
        <section className="panel lobby-invite" aria-label="Jemput kawan">
          <div className="lobby-logo">
            <Logo />
          </div>
          <div className="room-code">
            <span>KOD BILIK</span>
            <strong>{view.roomCode}</strong>
          </div>

          {isHost && online && (
            <>
              {qr && <img className="qr" src={qr} alt={`Kod QR untuk sertai bilik ${view.roomCode}`} />}
              <p className="note center">Kawan boleh imbas QR, buka pautan, atau tekan “Sertai Bilik” dan masukkan kod di atas.</p>
              <div className="invite-actions">
                <button className="btn btn-green btn-sm" onClick={copy}>
                  <Icon name={copied ? 'check' : 'copy'} size={18} /> {copied ? 'Disalin!' : 'Salin pautan'}
                </button>
                {'share' in navigator && (
                  <button className="btn btn-green btn-sm" onClick={share}>
                    <Icon name="share" size={18} /> Kongsi
                  </button>
                )}
              </div>
            </>
          )}
          {isHost && match.connection === 'connecting' && <p className="conn-note">{match.connectionNote}</p>}
          {isHost && match.connection === 'error' && <p className="conn-note warn">{match.connectionNote}</p>}
          {!isHost && <p className="note center">Anda telah sertai bilik ini. Hos akan mulakan permainan.</p>}
        </section>

        <section className="panel lobby-players" aria-label="Pemain dalam bilik">
          <div className="section-head">
            <h2 className="panel-title">PEMAIN</h2>
            <span className="pill">
              {view.players.length}/{MAX_PLAYERS}
            </span>
          </div>
          <ul className="lobby-list">
            {view.players.map((p) => (
              <li key={p.id} className={`lobby-row ${p.id === view.me ? 'me' : ''}`}>
                <Avatar id={p.avatar} name={p.name} />
                <span className="name">
                  {p.name}
                  {p.id === view.me && <small> · anda</small>}
                </span>
                {p.isHost && <span className="pill tag-host">Hos</span>}
                {p.isBot ? (
                  <span className="pill" title="Lawan komputer">
                    <Icon name="bot" size={14} /> Komputer
                  </span>
                ) : (
                  !p.isHost && (
                    <span className={`pill ${p.connected === false ? 'tag-away' : 'tag-ready'}`}>{p.connected === false ? 'Terputus' : 'Sedia'}</span>
                  )
                )}
                {isHost && !p.isHost && (
                  <button className="icon-btn icon-btn-sm" onClick={() => match.act({ type: 'remove', id: p.id })} aria-label={`Keluarkan ${p.name}`}>
                    <Icon name="x" size={16} />
                  </button>
                )}
              </li>
            ))}
            {Array.from({ length: MAX_PLAYERS - view.players.length }, (_, i) =>
              i === 0 && isHost ? (
                <li key="add">
                  <button className="lobby-row empty" onClick={() => match.act({ type: 'addBot' })}>
                    <Icon name="plus" size={18} /> Tambah lawan komputer
                  </button>
                </li>
              ) : (
                <li key={i} className="lobby-row empty" aria-hidden>
                  Menunggu pemain…
                </li>
              ),
            )}
          </ul>

          <div className="field">
            <label id="mode-label">Mod permainan</label>
            <div className="seg" role="group" aria-labelledby="mode-label">
              {(['classic', 'quick'] as const).map((m) => (
                <button
                  key={m}
                  aria-pressed={mode === m}
                  disabled={!isHost}
                  onClick={() => match.act({ type: 'config', config: MODES[m] })}
                >
                  {m === 'classic' ? 'Klasik · 3 pusingan' : 'Pantas · 1 pusingan'}
                </button>
              ))}
            </div>
          </div>

          {isHost ? (
            <>
              <button className="btn" disabled={!canStart} onClick={() => match.act({ type: 'start' })}>
                MULA GAME
              </button>
              {!canStart && <p className="note center">Perlu sekurang-kurangnya {MIN_PLAYERS} pemain — jemput kawan atau tambah lawan komputer.</p>}
              {canStart && humans === 1 && <p className="note center">Anda bermain dengan lawan komputer sahaja. Kawan masih boleh sertai sebelum mula.</p>}
            </>
          ) : (
            <p className="phase-hint">Menunggu hos mulakan permainan…</p>
          )}

          <div className="lobby-foot">
            <button className="btn btn-ghost btn-sm" onClick={() => setHelp(true)}>
              <Icon name="help" size={18} /> Cara Main
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onExit}>
              <Icon name="door" size={18} /> Keluar
            </button>
          </div>
        </section>
      </div>

      {help && (
        <Modal label="Cara main" onClose={() => setHelp(false)}>
          <Tutorial onDone={() => setHelp(false)} />
        </Modal>
      )}
    </main>
  );
}
