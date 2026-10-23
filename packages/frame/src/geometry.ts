import type { Ctx2D, Rect } from './types';

export type CornerRadii = { tl: number; tr: number; br: number; bl: number };

export function radii(r: number | Partial<CornerRadii>): CornerRadii {
  if (typeof r === 'number') return { tl: r, tr: r, br: r, bl: r };
  return { tl: r.tl ?? 0, tr: r.tr ?? 0, br: r.br ?? 0, bl: r.bl ?? 0 };
}

/** Adds a rounded-rectangle sub-path. Implemented with arcTo for consistent results across canvas backends. */
export function roundRectPath(ctx: Ctx2D, rect: Rect, r: number | Partial<CornerRadii>): void {
  const { x, y, width: w, height: h } = rect;
  const max = Math.min(w, h) / 2;
  const c = radii(r);
  const tl = Math.min(c.tl, max);
  const tr = Math.min(c.tr, max);
  const br = Math.min(c.br, max);
  const bl = Math.min(c.bl, max);
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr > 0) ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  if (br > 0) ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  if (bl > 0) ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  if (tl > 0) ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

/**
 * Start/end points of a CSS `linear-gradient(<angle>deg, ...)` over a box.
 * CSS angles: 0deg points up, 90deg points right; the gradient line passes through the centre
 * and is long enough that the corners get the first and last colours.
 */
export function cssLinearGradientPoints(angleDeg: number, rect: Rect) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(rect.width * dx) + Math.abs(rect.height * dy);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return {
    x0: cx - (dx * len) / 2,
    y0: cy - (dy * len) / 2,
    x1: cx + (dx * len) / 2,
    y1: cy + (dy * len) / 2,
  };
}

/** Radius of a CSS `circle` radial gradient with the default `farthest-corner` size. */
export function farthestCorner(cx: number, cy: number, rect: Rect): number {
  const xs = [rect.x, rect.x + rect.width];
  const ys = [rect.y, rect.y + rect.height];
  let max = 0;
  for (const x of xs) for (const y of ys) max = Math.max(max, Math.hypot(x - cx, y - cy));
  return max;
}

/** Scale `src` to cover `dst`, returning the source crop. */
export function coverCrop(srcW: number, srcH: number, dst: Rect): Rect {
  const s = Math.max(dst.width / srcW, dst.height / srcH);
  const w = dst.width / s;
  const h = dst.height / s;
  return { x: (srcW - w) / 2, y: (srcH - h) / 2, width: w, height: h };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
