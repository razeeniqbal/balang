import { food, foodImage } from '../../engine/foods';
import { CARD_TONE, cardText, cardTitle } from '../../engine/predictions';
import type { CardOutcome, PredictionCard } from '../../engine/types';
import { fmt } from './common';
import { Icon, type IconName } from './Icon';

export type CardState = 'default' | 'keep' | 'discard' | 'locked' | 'correct' | 'wrong';

interface Props {
  card: PredictionCard;
  state?: CardState;
  kawkaw?: boolean;
  multiplier?: number;
  settled?: CardOutcome;
  onClick?: () => void;
  disabled?: boolean;
  dim?: boolean;
}

function Art({ card }: { card: PredictionCard }) {
  const A = <img src={foodImage(card.a)} alt="" />;
  const B = card.b ? <img src={foodImage(card.b)} alt="" /> : null;
  switch (card.kind) {
    case 'BANYAK_LAGI':
      return (
        <>
          {A}
          <span className="op">&gt;</span>
          {B}
        </>
      );
    case 'SIAPA_DULU':
    case 'JIRAN':
      return (
        <>
          {A}
          <span className="op">→</span>
          {B}
        </>
      );
    case 'DOUBLE':
      return (
        <>
          {A}
          {A}
        </>
      );
    case 'TAK_KELUAR':
      return <span className="no">{A}</span>;
    case 'TEPAT':
    case 'PALING_KURANG':
      return (
        <>
          {A}
          <span className="op">×{card.n}</span>
        </>
      );
    case 'DUA_ATAU_KURANG':
      return (
        <>
          {A}
          <span className="op">≤2</span>
        </>
      );
    case 'MASIH_ADA':
      return (
        <>
          {A}
          <span className="op">{card.n}+</span>
        </>
      );
    default:
      return A;
  }
}

const FLAG: Partial<Record<CardState, { icon: IconName; label: string }>> = {
  keep: { icon: 'check', label: 'Dipilih' },
  discard: { icon: 'trash', label: 'Akan dibuang' },
  locked: { icon: 'lock', label: 'Dikunci' },
  correct: { icon: 'check', label: 'Betul' },
  wrong: { icon: 'x', label: 'Salah' },
};

export function Card({ card, state = 'default', kawkaw, multiplier = 1, settled = 'open', onClick, disabled, dim }: Props) {
  const title = cardTitle(card);
  const text = cardText(card);
  const reward = card.reward * (kawkaw ? multiplier : 1);
  const penalty = card.penalty * (kawkaw ? multiplier : 1);
  const flag = FLAG[state];
  const cls = [
    'card',
    `tone-${CARD_TONE[card.kind]}`,
    state !== 'default' && `is-${state}`,
    kawkaw && 'is-kawkaw',
    dim && 'dim',
  ]
    .filter(Boolean)
    .join(' ');

  const settledLabel = settled === 'true' ? 'Dah pasti betul' : settled === 'false' ? 'Dah pasti salah' : '';
  const aria = `${title}. ${text} Ganjaran ${fmt(reward)}, penalti ${fmt(penalty)}.${kawkaw ? ' KAW-KAW aktif.' : ''}${flag ? ` ${flag.label}.` : ''}${settledLabel ? ` ${settledLabel}.` : ''}`;

  const body = (
    <>
      {flag && (
        <span className="card-flag" aria-hidden>
          <Icon name={kawkaw && state === 'locked' ? 'flame' : flag.icon} size={17} />
        </span>
      )}
      {kawkaw && <span className="kaw-tag">KAW-KAW</span>}
      {settled !== 'open' && state !== 'correct' && state !== 'wrong' && (
        <span className={`card-settled ${settled === 'true' ? 'yes' : 'no'}`} aria-hidden>
          {settled === 'true' ? 'DAH PASTI' : 'DAH GAGAL'}
        </span>
      )}
      <div className="card-title">{title}</div>
      <div className="card-art" aria-hidden>
        <Art card={card} />
      </div>
      <div className="card-text">{text}</div>
      <div className="card-value">
        <div className="card-reward">+{fmt(reward)}</div>
        <div className="card-penalty">−{fmt(penalty)}</div>
      </div>
      <span className="sr-only">{food(card.a).name}</span>
    </>
  );

  if (onClick) {
    return (
      <button className={cls} onClick={onClick} disabled={disabled} aria-pressed={state === 'keep' || state === 'discard'} aria-label={aria}>
        {body}
      </button>
    );
  }
  return (
    <div className={cls} aria-label={aria} role="group">
      {body}
    </div>
  );
}

/** Wide list-style card for phones: art, condition and value on one row. */
export function CardRow({ card, state = 'default', kawkaw, multiplier = 1, settled = 'open', onClick, disabled }: Props) {
  const title = cardTitle(card);
  const text = cardText(card);
  const reward = card.reward * (kawkaw ? multiplier : 1);
  const penalty = card.penalty * (kawkaw ? multiplier : 1);
  const flag = FLAG[state];
  const cls = ['card-row', `tone-${CARD_TONE[card.kind]}`, state !== 'default' && `is-${state}`, kawkaw && 'is-kawkaw', settled !== 'open' && `settled-${settled}`]
    .filter(Boolean)
    .join(' ');
  const settledLabel = settled === 'true' ? 'Dah pasti betul' : settled === 'false' ? 'Dah pasti salah' : '';
  const aria = `${title}. ${text} Ganjaran ${fmt(reward)}, penalti ${fmt(penalty)}.${kawkaw ? ' KAW-KAW aktif.' : ''}${flag ? ` ${flag.label}.` : ''}${settledLabel ? ` ${settledLabel}.` : ''}`;
  const body = (
    <>
      <span className="cr-art" aria-hidden>
        <Art card={card} />
      </span>
      <span className="cr-body">
        <span className="cr-title">
          {title}
          {settled !== 'open' && state !== 'correct' && state !== 'wrong' && (
            <span className={`cr-settled ${settled === 'true' ? 'yes' : 'no'}`}>{settled === 'true' ? 'DAH PASTI' : 'DAH GAGAL'}</span>
          )}
          {kawkaw && <span className="cr-kaw">KAW-KAW</span>}
        </span>
        <span className="cr-text">{text}</span>
      </span>
      <span className="cr-value">
        <b>+{fmt(reward)}</b>
        <small>−{fmt(penalty)}</small>
      </span>
      {flag && (
        <span className="cr-flag" aria-hidden>
          <Icon name={kawkaw && state === 'locked' ? 'flame' : flag.icon} size={14} />
        </span>
      )}
    </>
  );
  return onClick ? (
    <button className={cls} onClick={onClick} disabled={disabled} aria-pressed={state === 'keep' || state === 'discard'} aria-label={aria}>
      {body}
    </button>
  ) : (
    <div className={cls} role="group" aria-label={aria}>
      {body}
    </div>
  );
}

/** Compact portrait card for the phone's swipe strip; tapping opens the full card. */
export function MiniCard({ card, state = 'default', kawkaw, multiplier = 1, settled = 'open', onClick }: Props) {
  const title = cardTitle(card);
  const reward = card.reward * (kawkaw ? multiplier : 1);
  const penalty = card.penalty * (kawkaw ? multiplier : 1);
  const flag = FLAG[state];
  const cls = ['mini-card', `tone-${CARD_TONE[card.kind]}`, state !== 'default' && `is-${state}`, kawkaw && 'is-kawkaw', settled !== 'open' && `settled-${settled}`]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} onClick={onClick} aria-label={`${title}. ${cardText(card)} Ganjaran ${fmt(reward)}, penalti ${fmt(penalty)}.${flag ? ` ${flag.label}.` : ''} Tekan untuk lihat.`}>
      {flag && (
        <span className="mc-flag" aria-hidden>
          <Icon name={kawkaw && state === 'locked' ? 'flame' : flag.icon} size={13} />
        </span>
      )}
      <span className="mc-title">{title}</span>
      <span className="mc-art" aria-hidden>
        <Art card={card} />
      </span>
      {settled !== 'open' && <span className={`mc-settled ${settled === 'true' ? 'yes' : 'no'}`}>{settled === 'true' ? 'DAH PASTI' : 'DAH GAGAL'}</span>}
      <span className="mc-value">
        <b>+{fmt(reward)}</b>
        <small>−{fmt(penalty)}</small>
      </span>
    </button>
  );
}
