import { describe, expect, it } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { BUILT_IN_BACKGROUNDS, BUILT_IN_PRESETS, DEFAULT_FRAME, type FrameSettings } from '@weshot/shared';
import { matchSnapshot, pixel, render, demoSource } from './helpers';

const frame = (patch: Partial<FrameSettings> = {}): FrameSettings => ({ ...DEFAULT_FRAME, ...patch });
const win = (patch: Partial<FrameSettings['window']>) => ({ ...DEFAULT_FRAME.window, ...patch });

describe('built-in presets', () => {
  for (const preset of BUILT_IN_PRESETS) {
    for (const scale of [1, 2]) {
      it(`${preset.name} @${scale}x`, () => {
        const { canvas } = render(preset.frame, scale);
        matchSnapshot(canvas, `preset-${preset.id}@${scale}x`);
      });
    }
  }
});

describe('built-in backgrounds', () => {
  for (const bg of BUILT_IN_BACKGROUNDS) {
    for (const scale of [1, 2]) {
      it(`${bg.name} @${scale}x`, () => {
        const { canvas } = render(frame({ background: { kind: 'preset', id: bg.id }, canvas: 'og-image' }), scale);
        matchSnapshot(canvas, `background-${bg.id}@${scale}x`);
      });
    }
  }

  it('Honey paints the spec gradient: #FFE45C at the top-left corner, #FFB800 at the bottom-right', () => {
    const { canvas } = render(frame({ shadow: 'none' }), 1);
    const [r1, g1, b1] = pixel(canvas, 0, 0);
    const [r2, g2, b2] = pixel(canvas, canvas.width - 1, canvas.height - 1);
    expect(Math.abs(r1 - 0xff) + Math.abs(g1 - 0xe4) + Math.abs(b1 - 0x5c)).toBeLessThan(12);
    expect(Math.abs(r2 - 0xff) + Math.abs(g2 - 0xb8) + Math.abs(b2 - 0x00)).toBeLessThan(12);
  });
});

describe('window options', () => {
  const cases: Array<[string, Partial<FrameSettings>]> = [
    ['safari-dark', { window: win({ style: 'safari' }) }],
    ['safari-light', { window: win({ style: 'safari', theme: 'light' }) }],
    ['none', { window: win({ style: 'none' }) }],
    ['macos-light-title', { window: win({ theme: 'light', titleBar: 'title' }) }],
    ['macos-custom-mono', { window: win({ titleBar: { custom: 'Launch day' }, lights: 'mono' }) }],
    ['macos-empty-hidden', { window: win({ titleBar: 'empty', lights: 'hidden', radius: 0 }) }],
    ['radius-24-deep', { window: win({ radius: 24 }), shadow: 'deep' }],
    ['no-shadow-padding-0', { shadow: 'none', padding: 0 }],
    ['padding-200', { padding: 200 }],
  ];
  for (const [name, patch] of cases) {
    it(name, () => matchSnapshot(render(frame(patch), 1).canvas, `window-${name}`));
  }
});

describe('background options', () => {
  it('custom solid', () => matchSnapshot(render(frame({ background: { kind: 'solid', color: '#3355FF' } }), 1).canvas, 'bg-solid'));
  it('custom gradient', () =>
    matchSnapshot(render(frame({ background: { kind: 'gradient', from: '#FFD60A', to: '#000000', angle: 45 } }), 1).canvas, 'bg-gradient'));
  it('image with blur 40 and grain 20', () => {
    const img = demoSource(800, 500);
    const { canvas } = render(frame({ background: { kind: 'image', src: 'x' }, blur: 40, grain: 20 }), 1, demoSource(), {
      backgroundImage: img as never,
    });
    matchSnapshot(canvas, 'bg-image-blur-grain');
  });
  it('grain is deterministic', () => {
    const a = render(frame({ grain: 12 }), 1).canvas.toBuffer('image/png');
    const b = render(frame({ grain: 12 }), 1).canvas.toBuffer('image/png');
    expect(a.equals(b)).toBe(true);
  });
  it('transparent output keeps the corners clear', () => {
    const { canvas } = render(frame({ background: { kind: 'transparent' } }), 1);
    expect(pixel(canvas, 0, 0)[3]).toBe(0);
    matchSnapshot(canvas, 'bg-transparent');
  });
});

describe('canvas sizes and placement', () => {
  for (const id of ['linkedin', 'instagram', 'product-hunt', 'dribbble'] as const) {
    it(id, () => matchSnapshot(render(frame({ canvas: id }), 1).canvas, `canvas-${id}`));
  }
  it('auto', () => {
    const { canvas, size } = render(frame({ canvas: 'auto' }), 1, demoSource(1280, 800));
    expect(canvas.width).toBe(size.width);
    matchSnapshot(canvas, 'canvas-auto');
  });
  it('window bleeds off the bottom-right edge', () =>
    matchSnapshot(render(frame({ windowScale: 1.3, windowOffset: { x: 300, y: 220 } }), 1).canvas, 'canvas-bleed'));
  it('full-page capture is cropped from the top', () =>
    matchSnapshot(render(frame(), 1, demoSource(1440, 6000)).canvas, 'canvas-fullpage'));
});

describe('video template (source = null)', () => {
  it('leaves the content area transparent and returns its rect', () => {
    const { canvas, result } = render(frame(), 1, null);
    const r = result.contentRect;
    expect(pixel(canvas, Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2))[3]).toBe(0);
    expect(pixel(canvas, 2, 2)[3]).toBe(255);
    expect(result.contentRadius).toBeGreaterThan(0);
    matchSnapshot(canvas, 'template');
  });
});

describe('export matches preview at every scale', () => {
  it('1x, 2x and 4x renders agree once downsampled', () => {
    const settings = BUILT_IN_PRESETS[0]!.frame;
    const one = render(settings, 1).canvas;
    for (const scale of [2, 4]) {
      const big = render(settings, scale).canvas;
      expect(big.width).toBe(one.width * scale);
      const down = createCanvas(one.width, one.height);
      const dctx = down.getContext('2d');
      dctx.imageSmoothingQuality = 'high';
      dctx.drawImage(big, 0, 0, one.width, one.height);
      // Mean absolute difference per channel must be tiny: same layout, same colours, only sharper edges.
      const a = one.getContext('2d').getImageData(0, 0, one.width, one.height).data;
      const b = dctx.getImageData(0, 0, one.width, one.height).data;
      let sum = 0;
      for (let i = 0; i < a.length; i++) sum += Math.abs(a[i]! - b[i]!);
      expect(sum / a.length).toBeLessThan(2.5);
    }
  });
  it('rendering is deterministic at 2x', () => {
    const s = BUILT_IN_PRESETS[1]!.frame;
    expect(render(s, 2).canvas.toBuffer('image/png').equals(render(s, 2).canvas.toBuffer('image/png'))).toBe(true);
  });
});
