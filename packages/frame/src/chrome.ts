import { displayUrl, type FrameSettings } from '@weshot/shared';
import { CHROME, COLORS } from './constants';
import { roundRectPath } from './geometry';
import type { Ctx2D, FrameResources, Rect } from './types';

type Theme = FrameSettings['window']['theme'];

function fitText(ctx: Ctx2D, text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${text.slice(0, lo)}…` : '';
}

export function drawTrafficLights(ctx: Ctx2D, bar: Rect, unit: number, mode: FrameSettings['window']['lights'], theme: Theme): number {
  const size = CHROME.lightSize * unit;
  const gap = CHROME.lightGap * unit;
  const left = bar.x + CHROME.lightLeft * unit;
  const cy = bar.y + bar.height / 2;
  const end = left + size * 3 + gap * 2;
  if (mode === 'hidden') return bar.x;
  const colors =
    mode === 'color'
      ? [COLORS.lights.red, COLORS.lights.yellow, COLORS.lights.green]
      : [COLORS.lightsMono[theme], COLORS.lightsMono[theme], COLORS.lightsMono[theme]];
  colors.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(left + size / 2 + i * (size + gap), cy, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  return end;
}

function titleText(settings: FrameSettings, res: FrameResources): string {
  const tb = settings.window.titleBar;
  if (typeof tb === 'object') return tb.custom;
  if (tb === 'url') return res.url ? displayUrl(res.url) : '';
  if (tb === 'title') return res.title ?? (res.url ? displayUrl(res.url) : '');
  return '';
}

function drawChevron(ctx: Ctx2D, cx: number, cy: number, size: number, dir: -1 | 1, color: string, unit: number) {
  ctx.beginPath();
  ctx.moveTo(cx - (dir * size) / 4, cy - size / 2);
  ctx.lineTo(cx + (dir * size) / 4, cy);
  ctx.lineTo(cx - (dir * size) / 4, cy + size / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6 * unit;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawLock(ctx: Ctx2D, x: number, cy: number, unit: number, color: string) {
  const w = 8 * unit;
  const h = 6 * unit;
  const top = cy - h / 2 + 2 * unit;
  ctx.beginPath();
  roundRectPath(ctx, { x, y: top, width: w, height: h }, 1.5 * unit);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w / 2, top, 2.6 * unit, Math.PI, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3 * unit;
  ctx.stroke();
}

/** Title bar contents: lights, then URL pill / title text (macOS) or nav + address field (Safari). */
export function drawTitleBarContent(ctx: Ctx2D, bar: Rect, unit: number, settings: FrameSettings, res: FrameResources): void {
  const { theme, style, lights } = settings.window;
  const family = res.fontFamily;
  const lightsEnd = drawTrafficLights(ctx, bar, unit, lights, theme);
  const cx = bar.x + bar.width / 2;
  const cy = bar.y + bar.height / 2;
  const text = titleText(settings, res);
  const sideReserve = (CHROME.lightLeft + CHROME.lightSize * 3 + CHROME.lightGap * 2 + 24) * unit;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (style === 'safari') {
    const glyph = COLORS.glyph[theme];
    const navX = Math.max(lightsEnd, bar.x + CHROME.lightLeft * unit) + 22 * unit;
    drawChevron(ctx, navX, cy, 12 * unit, -1, glyph, unit);
    drawChevron(ctx, navX + 20 * unit, cy, 12 * unit, 1, COLORS.lightsMono[theme], unit);
    const reserve = navX + 40 * unit - bar.x;
    const fieldW = Math.max(120 * unit, Math.min(bar.width * 0.52, bar.width - reserve * 2));
    const fieldH = CHROME.safariFieldHeight * unit;
    const field = { x: cx - fieldW / 2, y: cy - fieldH / 2, width: fieldW, height: fieldH };
    ctx.beginPath();
    roundRectPath(ctx, field, CHROME.safariFieldRadius * unit);
    ctx.fillStyle = COLORS.pillFill[theme];
    ctx.fill();
    if (text) {
      ctx.font = `400 ${CHROME.pillFontSize * unit}px ${family}`;
      const fitted = fitText(ctx, text, fieldW - 48 * unit);
      const tw = ctx.measureText(fitted).width;
      const showLock = settings.window.titleBar === 'url' && !!res.url?.startsWith('https:');
      const lockW = showLock ? 14 * unit : 0;
      if (showLock) drawLock(ctx, cx - (tw + lockW) / 2, cy, unit, glyph);
      ctx.fillStyle = COLORS.pillText[theme];
      ctx.fillText(fitted, cx + lockW / 2, cy);
    }
    return;
  }

  if (!text) return;
  if (settings.window.titleBar === 'url') {
    ctx.font = `400 ${CHROME.pillFontSize * unit}px ${family}`;
    const fitted = fitText(ctx, text, bar.width - sideReserve * 2 - CHROME.pillPadX * 2 * unit);
    if (!fitted) return;
    const tw = ctx.measureText(fitted).width;
    const pillH = (CHROME.pillFontSize * 1.25 + CHROME.pillPadY * 2) * unit;
    const pillW = tw + CHROME.pillPadX * 2 * unit;
    ctx.beginPath();
    roundRectPath(ctx, { x: cx - pillW / 2, y: cy - pillH / 2, width: pillW, height: pillH }, pillH / 2);
    ctx.fillStyle = COLORS.pillFill[theme];
    ctx.fill();
    ctx.fillStyle = COLORS.pillText[theme];
    ctx.fillText(fitted, cx, cy);
  } else {
    ctx.font = `600 ${CHROME.titleFontSize * unit}px ${family}`;
    const fitted = fitText(ctx, text, bar.width - sideReserve * 2);
    ctx.fillStyle = COLORS.pillText[theme];
    ctx.fillText(fitted, cx, cy);
  }
}
