import type { Ctx2D } from './types';

/** Integer hash → [-1, 1]. Deterministic per device pixel so preview, export and snapshots agree. */
function noise(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h & 0xffff) / 0xffff) * 2 - 1;
}

/**
 * Monochrome film grain over the region (device px). `amount` is the grain setting in percent (0–20).
 * Fully transparent pixels are left alone so transparent output stays transparent.
 */
export function applyGrain(ctx: Ctx2D, x: number, y: number, w: number, h: number, amount: number): void {
  if (amount <= 0 || w <= 0 || h <= 0) return;
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const amp = amount * 1.28;
  for (let j = 0; j < h; j++) {
    let i = j * w * 4;
    for (let k = 0; k < w; k++, i += 4) {
      if (d[i + 3] === 0) continue;
      const n = noise(x + k, y + j) * amp;
      d[i] = d[i]! + n;
      d[i + 1] = d[i + 1]! + n;
      d[i + 2] = d[i + 2]! + n;
    }
  }
  ctx.putImageData(img, x, y);
}
