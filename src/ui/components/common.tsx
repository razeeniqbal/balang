import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { chipImage, food } from '../../engine/foods';
import type { FoodId } from '../../engine/types';

export function Logo({ tagline = true }: { tagline?: boolean }) {
  return (
    <div className="logo" role="img" aria-label="BALANG. Agak. Risiko. Menang.">
      <img className="logo-lid" src="/assets/jar/lid.png" alt="" />
      <span className="logo-word">BALANG</span>
      {tagline && <span className="logo-tag">Agak. Risiko. Menang.</span>}
    </div>
  );
}

export const avatarSrc = (id: string) => `/assets/avatars/${id}.png`;

export function Avatar({ id, name }: { id: string; name: string }) {
  return <img className="avatar" src={avatarSrc(id)} alt={name} />;
}

export function Chip({ id, size }: { id: FoodId; size?: number }) {
  const f = food(id);
  return <img src={chipImage(id)} alt={f.name} title={f.name} width={size} height={size} />;
}

export const fmt = (n: number) => n.toLocaleString('en-MY');
export const signed = (n: number) => (n >= 0 ? `+${fmt(n)}` : `−${fmt(Math.abs(n))}`);

export function Modal({ children, onClose, label }: { children: ReactNode; onClose?: () => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, [href], input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal panel" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        {onClose && (
          <button className="icon-btn modal-x" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ['#f8c93a', '#ef5a4c', '#3f9a62', '#fffaf0', '#e2527a', '#e06a18'];

export function Confetti({ count = 90 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.4 + Math.random() * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.left}%`,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            transform: `rotate(${b.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
