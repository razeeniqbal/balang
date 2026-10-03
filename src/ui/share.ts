import { chipImage, food } from '../engine/foods';
import { cardTitle } from '../engine/predictions';
import type { PlayerStats } from '../engine/stats';
import type { FoodId, Player } from '../engine/types';
import { avatarSrc, fmt, signed } from './components/common';

interface ShareData {
  player: Player;
  position: number;
  players: number;
  score: number;
  stats: PlayerStats;
  foods: FoodId[];
}

const load = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Share card rendered from structured match data, never a UI screenshot. */
export async function renderShareCard(d: ShareData): Promise<Blob> {
  await document.fonts?.ready;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const display = '"Lilita One", sans-serif';
  const body = '"Plus Jakarta Sans", sans-serif';

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#145235');
  bg.addColorStop(1, '#082a1c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 330, 40, W / 2, 330, 600);
  glow.addColorStop(0, 'rgba(255,214,140,0.35)');
  glow.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const [lid, avatar, ...chips] = await Promise.all([
    load('/assets/jar/lid.png'),
    load(avatarSrc(d.player.avatar)),
    ...d.foods.map((f) => load(chipImage(f))),
  ]);

  // logo
  ctx.drawImage(lid, W / 2 - 110, 50, 220, 108);
  ctx.textAlign = 'center';
  ctx.font = `150px ${display}`;
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#082a1c';
  ctx.lineJoin = 'round';
  ctx.strokeText('BALANG', W / 2, 280);
  const gold = ctx.createLinearGradient(0, 150, 0, 290);
  gold.addColorStop(0, '#ffe58a');
  gold.addColorStop(1, '#e59a12');
  ctx.fillStyle = gold;
  ctx.fillText('BALANG', W / 2, 280);
  ctx.font = `38px ${display}`;
  ctx.fillStyle = '#fbf1dc';
  ctx.fillText('Agak. Risiko. Menang.', W / 2, 340);

  // avatar + name
  ctx.drawImage(avatar, W / 2 - 120, 390, 240, 240);
  ctx.font = `64px ${display}`;
  ctx.fillStyle = '#fffaf0';
  ctx.fillText(d.player.name, W / 2, 700);

  // position ribbon
  const posText = d.position === 1 ? '👑 JUARA!' : `TEMPAT #${d.position} / ${d.players}`;
  ctx.font = `52px ${display}`;
  const pw = ctx.measureText(posText).width + 90;
  roundRect(ctx, W / 2 - pw / 2, 730, pw, 84, 42);
  ctx.fillStyle = '#f8c93a';
  ctx.fill();
  ctx.fillStyle = '#082a1c';
  ctx.fillText(posText, W / 2, 792);

  // score
  ctx.font = `120px ${display}`;
  ctx.fillStyle = '#ffe07a';
  ctx.fillText(fmt(d.score), W / 2, 950);
  ctx.font = `600 30px ${body}`;
  ctx.fillStyle = '#f1e1bf';
  ctx.fillText('MATA AKHIR', W / 2, 995);

  // stats
  const s = d.stats;
  const tiles: [string, string][] = [
    ['BAIK', `${Math.round(s.accuracy * 100)}%`],
    ['TERBAIK', s.best ? signed(s.best.delta) : '-'],
    ['KAW-KAW', `${s.kawkawWon}/${s.kawkawTried}`],
    ['RENTETAN', String(s.longestStreak)],
  ];
  const tw = 220;
  const gap = 20;
  const x0 = (W - (tw * 4 + gap * 3)) / 2;
  tiles.forEach(([label, value], i) => {
    const x = x0 + i * (tw + gap);
    roundRect(ctx, x, 1040, tw, 150, 24);
    ctx.fillStyle = '#fbf1dc';
    ctx.fill();
    ctx.fillStyle = '#52614f';
    ctx.font = `800 24px ${body}`;
    ctx.fillText(label, x + tw / 2, 1085);
    ctx.fillStyle = '#0e3b28';
    ctx.font = `60px ${display}`;
    ctx.fillText(value, x + tw / 2, 1160);
  });
  if (s.best) {
    ctx.font = `600 26px ${body}`;
    ctx.fillStyle = '#f1e1bf';
    ctx.fillText(`Ramalan terbaik: ${cardTitle(s.best.card)} · ${food(s.best.card.a).name}`, W / 2, 1235);
  }

  // food chips
  const cs = 70;
  const cx0 = (W - (chips.length * cs + (chips.length - 1) * 16)) / 2;
  chips.forEach((img, i) => ctx.drawImage(img, cx0 + i * (cs + 16), 1255, cs, cs));

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}
