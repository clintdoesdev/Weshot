import { describe, expect, it } from 'vitest';
import { DEFAULT_FRAME, type FrameSettings } from '@weshot/shared';
import { computeLayout, cssLinearGradientPoints, resolveCanvasSize } from '../src';

const frame = (patch: Partial<FrameSettings> = {}): FrameSettings => ({ ...DEFAULT_FRAME, ...patch });

describe('resolveCanvasSize', () => {
  it('uses size presets', () => {
    expect(resolveCanvasSize(frame(), null)).toEqual({ width: 1600, height: 900 });
    expect(resolveCanvasSize(frame({ canvas: 'instagram' }), null)).toEqual({ width: 1080, height: 1350 });
    expect(resolveCanvasSize(frame({ canvas: { width: 800, height: 600 } }), null)).toEqual({ width: 800, height: 600 });
  });
  it('auto wraps the source with padding and the title bar, capping content width at 1600', () => {
    const s = resolveCanvasSize(frame({ canvas: 'auto', padding: 50 }), { width: 1280, height: 800 });
    expect(s.width).toBe(1380);
    expect(s.height).toBe(Math.round(800 + 42 * (1280 / 640) + 100));
    const big = resolveCanvasSize(frame({ canvas: 'auto', padding: 0, window: { ...DEFAULT_FRAME.window, style: 'none' } }), {
      width: 2880,
      height: 1800,
    });
    expect(big).toEqual({ width: 1600, height: 1000 });
  });
});

describe('computeLayout', () => {
  it('fits the window inside the padding and centres it', () => {
    const l = computeLayout(frame(), { width: 1440, height: 900 }, { width: 1600, height: 900 });
    expect(l.window.y).toBeGreaterThanOrEqual(52 - 0.01);
    expect(l.window.y + l.window.height).toBeLessThanOrEqual(900 - 52 + 0.01);
    expect(l.window.x + l.window.width / 2).toBeCloseTo(800);
    expect(l.content.width / l.content.height).toBeCloseTo(1440 / 900);
    expect(l.titleBar!.height).toBeCloseTo(42 * l.unit);
  });
  it('crops tall full-page captures from the top', () => {
    const l = computeLayout(frame(), { width: 1440, height: 9000 }, { width: 1600, height: 900 });
    expect(l.sourceCrop.y).toBe(0);
    expect(l.sourceCrop.height).toBeLessThan(9000);
    expect(l.content.width).toBeCloseTo(1600 - 104);
  });
  it('applies window scale and offset (bleed)', () => {
    const base = computeLayout(frame(), null, { width: 1600, height: 900 });
    const l = computeLayout(frame({ windowScale: 1.5, windowOffset: { x: 200, y: 100 } }), null, { width: 1600, height: 900 });
    expect(l.window.width).toBeCloseTo(base.window.width * 1.5);
    expect(l.window.x + l.window.width / 2).toBeCloseTo(1000);
    expect(l.window.y + l.window.height).toBeGreaterThan(900);
  });
  it('has no title bar for the None style', () => {
    const l = computeLayout(frame({ window: { ...DEFAULT_FRAME.window, style: 'none' } }), null, { width: 1600, height: 900 });
    expect(l.titleBar).toBeNull();
    expect(l.content).toEqual(l.window);
  });
});

describe('cssLinearGradientPoints', () => {
  it('180deg runs top to bottom', () => {
    const p = cssLinearGradientPoints(180, { x: 0, y: 0, width: 100, height: 50 });
    expect(p.x0).toBeCloseTo(50);
    expect(p.y0).toBeCloseTo(0);
    expect(p.y1).toBeCloseTo(50);
  });
  it('90deg runs left to right', () => {
    const p = cssLinearGradientPoints(90, { x: 0, y: 0, width: 100, height: 50 });
    expect(p.x0).toBeCloseTo(0);
    expect(p.x1).toBeCloseTo(100);
  });
});
