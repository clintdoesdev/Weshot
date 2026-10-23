import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { renderFrame, type Ctx2D, type ScratchCanvas } from '@weshot/frame';
import { DEFAULT_CAPTURE, DEFAULT_FRAME, DEFAULT_RECORD, type RecordSettings } from '@weshot/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ffmpegPath } from '../src/record/ffmpeg';
import { recordPage } from '../src/record/recorder';
import { startTestSite, testPolicy, testResolver, type TestSite } from './server';

const W = 960;
const H = 540;

/** The browser renders this in production (renderFrame with a null source); here Node does the same. */
function template() {
  const c = createCanvas(W, H);
  const res = renderFrame(c.getContext('2d') as unknown as Ctx2D, null, { ...DEFAULT_FRAME, canvas: { width: W, height: H } }, { width: W, height: H, scale: 1 }, {
    sourceSize: { width: 800, height: 600 },
    createCanvas: (w, h) => createCanvas(w, h) as unknown as ScratchCanvas,
  });
  return { png: c.toBuffer('image/png'), rect: res.contentRect };
}

function probe(file: Buffer, ext: string) {
  const dir = mkdtempSync(join(tmpdir(), 'probe-'));
  const p = join(dir, `v.${ext}`);
  writeFileSync(p, file);
  // ffmpeg -i prints stream info to stderr and exits non-zero without an output; that's fine here.
  try {
    execFileSync(ffmpegPath(), ['-hide_banner', '-i', p], { stdio: 'pipe' });
  } catch (e) {
    return String((e as { stderr: Buffer }).stderr);
  }
  return '';
}

/** Decode one frame to raw RGB and read a pixel. */
function pixelAt(file: Buffer, ext: string, t: number, x: number, y: number): [number, number, number] {
  const dir = mkdtempSync(join(tmpdir(), 'px-'));
  const p = join(dir, `v.${ext}`);
  writeFileSync(p, file);
  const raw = execFileSync(ffmpegPath(), ['-v', 'error', '-ss', String(t), '-i', p, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const width = ext === 'gif' ? 800 : W;
  const i = (y * width + x) * 3;
  return [raw[i]!, raw[i + 1]!, raw[i + 2]!];
}

describe('recordPage', () => {
  let site: TestSite;
  beforeAll(async () => {
    site = await startTestSite();
  });
  afterAll(async () => {
    await site.close();
  });

  const run = (patch: Partial<RecordSettings>) => {
    const t = template();
    return recordPage(
      {
        capture: { ...DEFAULT_CAPTURE, url: `http://public.test:${site.port}/`, viewport: { width: 800, height: 600 } },
        record: { ...DEFAULT_RECORD, lengthSec: 2, fps: 30, ...patch },
        templatePng: t.png,
        contentRect: t.rect,
        output: { width: W, height: H },
      },
      { resolver: testResolver(), allowed: testPolicy, adblock: false },
    ).then((r) => ({ ...r, rect: t.rect }));
  };

  it('encodes MP4 (H.264, yuv420p) with the page inside the frame', async () => {
    const r = await run({ format: 'mp4' });
    expect(r.frames).toBe(60);
    const info = probe(r.file, 'mp4');
    expect(info).toMatch(/Video: h264/);
    expect(info).toMatch(/yuv420p/);
    expect(info).toMatch(new RegExp(`${W}x${H}`));
    // Centre of the content area shows the page (blue #3355ff); a corner shows the Honey background.
    const [pr, pg, pb] = pixelAt(r.file, 'mp4', 1, Math.round(r.rect.x + r.rect.width / 2), Math.round(r.rect.y + r.rect.height / 2));
    expect(pb).toBeGreaterThan(200);
    expect(pr).toBeLessThan(110);
    expect(pg).toBeLessThan(130);
    const [cr, cg, cb] = pixelAt(r.file, 'mp4', 1, 4, 4);
    expect(cr).toBeGreaterThan(220);
    expect(cg).toBeGreaterThan(190);
    expect(cb).toBeLessThan(140);
  });

  it('encodes WebM (VP9)', async () => {
    const r = await run({ format: 'webm' });
    expect(probe(r.file, 'webm')).toMatch(/Video: vp9/);
  });

  it('encodes GIF at 15 fps, 800 px wide', async () => {
    const r = await run({ format: 'gif' });
    expect(r.frames).toBe(30);
    const info = probe(r.file, 'gif');
    expect(info).toMatch(/Video: gif/);
    expect(info).toMatch(/800x450/);
    expect(r.width).toBe(800);
  });

  it('records 60 fps', async () => {
    const r = await run({ format: 'mp4', fps: 60, lengthSec: 1 });
    expect(r.frames).toBe(60);
    expect(probe(r.file, 'mp4')).toMatch(/60 fps/);
  });

  it('can stop early', async () => {
    const t = template();
    let checks = 0;
    const r = await recordPage(
      {
        capture: { ...DEFAULT_CAPTURE, url: `http://public.test:${site.port}/tall`, viewport: { width: 800, height: 600 } },
        record: { ...DEFAULT_RECORD, lengthSec: 10, format: 'mp4' },
        templatePng: t.png,
        contentRect: t.rect,
        output: { width: W, height: H },
      },
      { resolver: testResolver(), allowed: testPolicy, adblock: false, shouldStop: async () => ++checks >= 2 },
    );
    expect(r.frames).toBe(30);
  });
});
