import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Canvas, GlobalFonts, createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { FrameSettings } from '@weshot/shared';
import { drawDemoPage, renderFrame, resolveCanvasSize, type Ctx2D, type FrameResources, type FrameSource, type ScratchCanvas } from '../src';

const here = dirname(fileURLToPath(import.meta.url));
for (const w of [400, 500, 600]) GlobalFonts.registerFromPath(join(here, `fixtures/inter-latin-${w}-normal.woff2`), 'WeShotTest');

export const FONT = "'WeShotTest'";
export const SNAP_DIR = join(here, '__snapshots__');
const DIFF_DIR = join(here, '__diff__');

// @napi-rs/canvas implements the DOM canvas API but its TS types are separate; these casts bridge them.
export function asCtx(ctx: SKRSContext2D): Ctx2D {
  return ctx as unknown as Ctx2D;
}
export function asSource(canvas: Canvas): FrameSource {
  return canvas as unknown as FrameSource;
}

export const scratch = (w: number, h: number) => createCanvas(w, h) as unknown as ScratchCanvas;

export function demoSource(width = 1440, height = 900): Canvas {
  const c = createCanvas(width, height);
  drawDemoPage(asCtx(c.getContext('2d')), width, height, FONT);
  return c;
}

export function render(
  settings: FrameSettings,
  scale: number,
  source: Canvas | null = demoSource(),
  resources: FrameResources = {},
) {
  const size = resolveCanvasSize(settings, source ? { width: source.width, height: source.height } : null);
  const canvas = createCanvas(Math.round(size.width * scale), Math.round(size.height * scale));
  const result = renderFrame(asCtx(canvas.getContext('2d')), source ? asSource(source) : null, settings, { ...size, scale }, {
    fontFamily: FONT,
    createCanvas: scratch,
    url: 'https://queuely.app/',
    title: 'Queuely — lines that move themselves',
    ...resources,
  });
  return { canvas, result, size };
}

/**
 * Compares a canvas with a stored PNG. Writes the PNG when missing or when UPDATE_SNAPSHOTS=1.
 * A small pixel tolerance absorbs anti-aliasing differences between Skia builds.
 */
export function matchSnapshot(canvas: Canvas, name: string, maxDiffRatio = 0.002): void {
  mkdirSync(SNAP_DIR, { recursive: true });
  const file = join(SNAP_DIR, `${name}.png`);
  const actual = canvas.toBuffer('image/png');
  if (!existsSync(file) || process.env.UPDATE_SNAPSHOTS === '1') {
    if (process.env.CI && !existsSync(file)) throw new Error(`Missing snapshot ${name}.png`);
    writeFileSync(file, actual);
    return;
  }
  const a = PNG.sync.read(actual);
  const b = PNG.sync.read(readFileSync(file));
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`${name}: size ${a.width}×${a.height} differs from snapshot ${b.width}×${b.height}`);
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const ratio = n / (a.width * a.height);
  if (ratio > maxDiffRatio) {
    mkdirSync(DIFF_DIR, { recursive: true });
    writeFileSync(join(DIFF_DIR, `${name}.diff.png`), PNG.sync.write(diff));
    writeFileSync(join(DIFF_DIR, `${name}.actual.png`), actual);
    throw new Error(`${name}: ${(ratio * 100).toFixed(3)}% of pixels differ (see test/__diff__)`);
  }
}

export function pixel(canvas: Canvas, x: number, y: number): [number, number, number, number] {
  const d = canvas.getContext('2d').getImageData(x, y, 1, 1).data;
  return [d[0]!, d[1]!, d[2]!, d[3]!];
}
