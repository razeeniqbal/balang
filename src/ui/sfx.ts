/** Tiny synthesised sound set; no audio files needed. */
let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (on: boolean) => {
  enabled = on;
};

function audio() {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, delay = 0, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function rattle() {
  const a = audio();
  if (!a) return;
  for (let i = 0; i < 7; i++) tone(900 + Math.random() * 900, 0.05, 'triangle', 0.05, i * 0.055);
}

export const sfx = {
  shake: rattle,
  draw: () => tone(520, 0.18, 'triangle', 0.14, 0.05, 880),
  select: () => tone(660, 0.07, 'square', 0.04),
  discard: () => tone(300, 0.2, 'sawtooth', 0.06, 0, 140),
  lock: () => {
    tone(440, 0.08, 'square', 0.06);
    tone(660, 0.12, 'square', 0.06, 0.08);
  },
  kawkaw: () => {
    tone(220, 0.45, 'sawtooth', 0.08, 0, 880);
    tone(330, 0.45, 'triangle', 0.08, 0.05, 1320);
  },
  correct: () => [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, i * 0.09)),
  wrong: () => tone(220, 0.35, 'sawtooth', 0.07, 0, 110),
  /** Snare-style roll that builds for `secs`, played before the final standings appear. */
  drumroll: (secs = 1.4) => {
    const n = Math.round(secs / 0.045);
    for (let i = 0; i < n; i++) tone(180 + Math.random() * 60, 0.04, 'square', 0.02 + (0.05 * i) / n, i * 0.045);
    tone(90, 0.3, 'sine', 0.16, secs);
  },
  /** Winner's fanfare: rising arpeggio, then a held major chord. */
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, i * 0.11));
    [784, 988, 1175, 1568].forEach((f) => tone(f, 0.9, 'triangle', 0.07, 0.5));
    [523, 659, 784].forEach((f) => tone(f / 2, 0.9, 'sawtooth', 0.025, 0.5));
  },
  /** "Wah wah wah waaah" for everyone who did not win. */
  lose: () => {
    [392, 370, 349].forEach((f, i) => tone(f, 0.32, 'sawtooth', 0.07, i * 0.36, f * 0.97));
    tone(330, 1.0, 'sawtooth', 0.07, 1.08, 262);
  },
  pop: () => tone(880, 0.06, 'sine', 0.06),
};
