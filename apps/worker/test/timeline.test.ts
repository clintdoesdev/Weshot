import { describe, expect, it } from 'vitest';
import { buildTimeline, cursorAt } from '../src/record/timeline';

const base = { type: 'scroll' as const, lengthSec: 12, easing: 'easeInOut' as const, pauseAtHeadings: false, maxScroll: 4000, headings: [], stops: [] };

describe('buildTimeline', () => {
  it('scrolls from the top to the bottom over the length', () => {
    const tl = buildTimeline(base);
    expect(tl.at(0)).toBe(0);
    expect(tl.at(12)).toBeCloseTo(4000);
    for (let t = 0; t < 12; t += 0.1) expect(tl.at(t + 0.1)).toBeGreaterThanOrEqual(tl.at(t) - 1e-6);
  });
  it('linear easing moves at constant speed in the middle', () => {
    const tl = buildTimeline({ ...base, easing: 'linear' });
    const a = tl.at(5) - tl.at(4);
    const b = tl.at(7) - tl.at(6);
    expect(a).toBeCloseTo(b, 3);
  });
  it('pauses at headings', () => {
    const tl = buildTimeline({ ...base, pauseAtHeadings: true, headings: [1000, 2500] });
    expect(tl.rests).toHaveLength(2);
    const r = tl.rests[0]!;
    expect(tl.at(r + 0.05)).toBeCloseTo(1000);
    expect(tl.at(r + 0.5)).toBeCloseTo(1000);
  });
  it('tours the given sections in order', () => {
    const tl = buildTimeline({ ...base, type: 'tour', stops: [3000, 800, 1800] });
    expect(tl.rests.length).toBeGreaterThanOrEqual(2);
    expect(tl.at(tl.rests[0]! + 0.01)).toBeCloseTo(800);
    expect(tl.at(tl.rests[1]! + 0.01)).toBeCloseTo(1800);
  });
  it('stays still on pages that do not scroll', () => {
    const tl = buildTimeline({ ...base, maxScroll: 0 });
    expect(tl.at(5)).toBe(0);
  });
});

describe('cursorAt', () => {
  it('stays inside the viewport and ripples after a rest', () => {
    for (let t = 0; t < 20; t += 0.25) {
      const c = cursorAt(t, [5, 10]);
      expect(c.x).toBeGreaterThan(0);
      expect(c.x).toBeLessThan(1);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThan(1);
    }
    expect(cursorAt(5.2, [5]).ripple).not.toBeNull();
    expect(cursorAt(3, [5]).ripple).toBeNull();
  });
});
