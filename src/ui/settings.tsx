import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setSoundEnabled } from './sfx';

export interface Settings {
  sound: boolean;
  fast: boolean;
  autoDraw: boolean;
  motion: 'system' | 'reduced' | 'full';
}

const DEFAULTS: Settings = { sound: true, fast: false, autoDraw: false, motion: 'system' };
const KEY = 'balang.settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const Ctx = createContext<[Settings, (patch: Partial<Settings>) => void]>([DEFAULTS, () => {}]);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState(load);
  useEffect(() => {
    setSoundEnabled(s.sound);
    const root = document.documentElement;
    if (s.motion === 'system') root.removeAttribute('data-motion');
    else root.dataset.motion = s.motion;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable — settings just won't persist */
    }
  }, [s]);
  return <Ctx.Provider value={[s, (patch) => setS((prev) => ({ ...prev, ...patch }))]}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);

export function prefersReducedMotion(s: Settings) {
  if (s.motion !== 'system') return s.motion === 'reduced';
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
