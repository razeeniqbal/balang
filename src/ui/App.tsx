import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { normaliseCode, persistentClientId, type MatchClient } from '../engine/client';
import { GuestMatch } from '../net/guest';
import { HostMatch } from '../net/host';
import { Logo, Modal } from './components/common';
import { Icon } from './components/Icon';
import { Tutorial } from './components/Tutorial';
import { Game } from './screens/Game';
import { Home, type StartOptions } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { FinalResults, RoundResults } from './screens/Results';
import { RoundReveal } from './screens/RoundReveal';
import { useSettings } from './settings';

function inviteFromUrl() {
  return normaliseCode(new URLSearchParams(location.search).get('room') ?? '');
}

export function App() {
  const [match, setMatch] = useState<MatchClient | null>(null);
  const [invite, setInvite] = useState(inviteFromUrl);

  const start = (o: StartOptions) => {
    const id = persistentClientId();
    if (o.kind === 'host') {
      const m = new HostMatch(id, o.name, o.avatar, true);
      m.addBot();
      setMatch(m);
    } else {
      setMatch(new GuestMatch(id, o.code, o.name, o.avatar));
    }
  };

  const exit = () => {
    match?.dispose();
    setMatch(null);
    setInvite(null);
    if (location.search) history.replaceState(null, '', location.pathname);
  };

  return (
    <div className="table">
      {match ? <MatchScreens match={match} onExit={exit} /> : <Home onStart={start} inviteCode={invite} />}
    </div>
  );
}

function MatchScreens({ match, onExit }: { match: MatchClient; onExit: () => void }) {
  const view = useSyncExternalStore(match.subscribe, match.getView);
  const [settings] = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  // The 15th draw ends the round instantly. Decide during this render (not in
  // an effect) to keep the game mounted until that token's reveal has played;
  // switching away even for one frame would lose the animation.
  const prev = useRef(view);
  const holdUntil = useRef(0);
  if (view !== prev.current) {
    const was = prev.current;
    if (view?.phase === 'ROUND_RESOLUTION' && was?.phase === 'DRAW_PHASE' && view.drawIndex > was.drawIndex) {
      holdUntil.current = Date.now() + (settings.fast ? 1100 : 2300) + 700;
    }
    prev.current = view;
  }
  const [, rerender] = useState(0);
  const holding = view?.phase === 'ROUND_RESOLUTION' && Date.now() < holdUntil.current;
  useEffect(() => {
    if (!holding) return;
    const t = setTimeout(() => rerender((n) => n + 1), holdUntil.current - Date.now() + 20);
    return () => clearTimeout(t);
  }, [holding]);

  useEffect(() => {
    match.setSpeed(settings.fast);
    match.setAutoDraw(settings.autoDraw);
  }, [match, settings.fast, settings.autoDraw]);

  if (!view) {
    const failed = match.connection === 'error';
    return (
      <main className="lobby">
        <div className="panel connect-card" role="status">
          <Logo />
          {!failed && <div className="spinner" aria-hidden />}
          <p className={`conn-note ${failed ? 'warn' : ''}`}>{match.connectionNote}</p>
          <button className="btn btn-ghost btn-sm" onClick={onExit}>
            <Icon name="back" size={18} /> Kembali
          </button>
        </div>
      </main>
    );
  }

  let screen;
  switch (view.phase) {
    case 'LOBBY':
      screen = <Lobby view={view} match={match} onExit={onExit} />;
      break;
    case 'ROUND_REVEAL':
      screen = <RoundReveal view={view} match={match} />;
      break;
    case 'ROUND_RESOLUTION':
      screen = holding ? <Game view={view} match={match} onSettings={() => setShowSettings(true)} /> : <RoundResults view={view} match={match} />;
      break;
    case 'FINAL_RESULTS':
      screen = <FinalResults view={view} match={match} onExit={onExit} />;
      break;
    default:
      screen = <Game view={view} match={match} onSettings={() => setShowSettings(true)} />;
  }

  return (
    <>
      {screen}
      {!match.isHostDevice && match.connection !== 'online' && (
        <div className={`conn-banner ${match.connection === 'error' ? 'warn' : ''}`} role="alert">
          {match.connectionNote}
          {match.connection === 'error' && (
            <button className="btn btn-ghost btn-sm" onClick={onExit}>
              Keluar
            </button>
          )}
        </div>
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onExit={onExit} isHost={match.isHostDevice} />}
    </>
  );
}

function SettingsModal({ onClose, onExit, isHost }: { onClose: () => void; onExit: () => void; isHost: boolean }) {
  const [s, set] = useSettings();
  const [help, setHelp] = useState(false);
  if (help) {
    return (
      <Modal label="Cara main" onClose={() => setHelp(false)}>
        <Tutorial onDone={() => setHelp(false)} />
      </Modal>
    );
  }
  const row = (label: string, on: boolean, onChange: (v: boolean) => void, a: string, b: string) => (
    <div className="setting-row">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        <button aria-pressed={!on} onClick={() => onChange(false)}>
          {a}
        </button>
        <button aria-pressed={on} onClick={() => onChange(true)}>
          {b}
        </button>
      </div>
    </div>
  );
  return (
    <Modal label="Tetapan" onClose={onClose}>
      <h2 className="banner-title modal-title">TETAPAN</h2>
      <div className="settings">
        {row('Bunyi', s.sound, (v) => set({ sound: v }), 'Senyap', 'Hidup')}
        {row('Animasi cabutan', s.fast, (v) => set({ fast: v }), 'Biasa', 'Laju')}
        {row('Cabut automatik', s.autoDraw, (v) => set({ autoDraw: v }), 'Tidak', 'Ya')}
        <div className="setting-row">
          <span>Pergerakan</span>
          <div className="seg" role="group" aria-label="Pergerakan">
            {(['system', 'full', 'reduced'] as const).map((m) => (
              <button key={m} aria-pressed={s.motion === m} onClick={() => set({ motion: m })}>
                {m === 'system' ? 'Ikut sistem' : m === 'full' ? 'Penuh' : 'Kurang'}
              </button>
            ))}
          </div>
        </div>
        {!isHost && <p className="note">Kelajuan bot ditetapkan oleh hos.</p>}
        <div className="kaw-actions">
          <button className="btn btn-green btn-sm" onClick={() => setHelp(true)}>
            <Icon name="help" size={18} /> Cara Main
          </button>
          <button className="btn btn-red btn-sm" onClick={onExit}>
            <Icon name="door" size={18} /> {isHost ? 'Tutup bilik' : 'Keluar bilik'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
