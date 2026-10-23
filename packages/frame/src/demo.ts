import { roundRectPath } from './geometry';
import type { Ctx2D } from './types';

/**
 * Paints the sample landing page shown before the user pastes anything (UI spec §4, first visit).
 * It is page content, not WeShot UI, so it uses system-ui like a real site would.
 */
export function drawDemoPage(ctx: Ctx2D, width: number, height: number, fontFamily = 'system-ui, sans-serif'): void {
  const u = width / 1440;
  const font = (weight: number, px: number) => `${weight} ${px * u}px ${fontFamily}`;
  ctx.save();
  ctx.fillStyle = '#FBFAF7';
  ctx.fillRect(0, 0, width, height);

  // nav
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  roundRectPath(ctx, { x: 64 * u, y: 34 * u, width: 30 * u, height: 30 * u }, 8 * u);
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = font(650, 22);
  ctx.fillText('Queuely', 106 * u, 50 * u);
  ctx.font = font(450, 17);
  ctx.fillStyle = '#55524B';
  ['Product', 'Pricing', 'Customers', 'Docs'].forEach((label, i) => ctx.fillText(label, (560 + i * 120) * u, 50 * u));
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  roundRectPath(ctx, { x: 1236 * u, y: 28 * u, width: 140 * u, height: 44 * u }, 22 * u);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = font(600, 16);
  ctx.fillText('Start free', 1306 * u, 50 * u);

  // hero
  ctx.fillStyle = '#111111';
  ctx.font = font(700, 76);
  ctx.fillText('Lines that move', width / 2, 230 * u);
  ctx.fillText('themselves.', width / 2, 318 * u);
  ctx.fillStyle = '#6B675E';
  ctx.font = font(400, 22);
  ctx.fillText('Queuely books, reminds and seats your customers so nobody waits at the door.', width / 2, 398 * u);
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  roundRectPath(ctx, { x: width / 2 - 190 * u, y: 446 * u, width: 180 * u, height: 56 * u }, 28 * u);
  ctx.fill();
  ctx.strokeStyle = '#D8D4CA';
  ctx.lineWidth = 1.5 * u;
  ctx.beginPath();
  roundRectPath(ctx, { x: width / 2 + 10 * u, y: 446 * u, width: 180 * u, height: 56 * u }, 28 * u);
  ctx.stroke();
  ctx.font = font(600, 18);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Get started', width / 2 - 100 * u, 474 * u);
  ctx.fillStyle = '#111111';
  ctx.fillText('See a demo', width / 2 + 100 * u, 474 * u);

  // cards
  const cardW = 400 * u;
  const gap = 32 * u;
  const startX = (width - cardW * 3 - gap * 2) / 2;
  const tints = ['#FFE9A8', '#E7E3DA', '#DCE8E0'];
  for (let i = 0; i < 3; i++) {
    const x = startX + i * (cardW + gap);
    const y = 572 * u;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    roundRectPath(ctx, { x, y, width: cardW, height: 260 * u }, 22 * u);
    ctx.fill();
    ctx.strokeStyle = '#ECE8DF';
    ctx.stroke();
    ctx.fillStyle = tints[i]!;
    ctx.beginPath();
    roundRectPath(ctx, { x: x + 24 * u, y: y + 24 * u, width: cardW - 48 * u, height: 130 * u }, 14 * u);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'left';
    ctx.font = font(650, 22);
    ctx.fillText(['Smart waitlist', 'Text reminders', 'Live seating'][i]!, x + 24 * u, y + 190 * u);
    ctx.fillStyle = '#8A857A';
    ctx.font = font(400, 16);
    ctx.fillText(['Guests join from a QR code.', 'One tap to confirm or move.', 'See every table at a glance.'][i]!, x + 24 * u, y + 224 * u);
  }
  // fill the rest for tall demo pages
  for (let y = 880 * u; y < height; y += 120 * u) {
    ctx.fillStyle = '#EFECE5';
    ctx.beginPath();
    roundRectPath(ctx, { x: 120 * u, y, width: width - 240 * u, height: 84 * u }, 18 * u);
    ctx.fill();
  }
  ctx.restore();
}
