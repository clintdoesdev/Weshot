/**
 * Scroll timeline for recordings (product spec §4.7 step 2). Pure: maps video time → scroll offset.
 * Video time is virtual: frames are captured one by one, so motion stays smooth however long a frame takes.
 */
export type Easing = 'linear' | 'easeInOut';

export type TimelineInput = {
  type: 'scroll' | 'tour';
  lengthSec: number;
  easing: Easing;
  pauseAtHeadings: boolean;
  /** Maximum scrollTop (scrollHeight − viewport height), already capped at 16,000 px. */
  maxScroll: number;
  /** Heading offsets (scroll positions), for pauses. */
  headings: number[];
  /** Section offsets for the tour. */
  stops: number[];
};

type Segment = { t0: number; t1: number; y0: number; y1: number };

export type Timeline = {
  at(t: number): number;
  /** Times at which the scroll comes to rest at a stop; the cursor clicks there. */
  rests: number[];
  duration: number;
};

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function pickEvenly(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(values[Math.round((i * (values.length - 1)) / (max - 1))]!);
  return [...new Set(out)];
}

function uniqueSorted(values: number[], maxScroll: number, minGap: number): number[] {
  const sorted = values
    .map((v) => Math.min(maxScroll, Math.max(0, Math.round(v))))
    .sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) if (out.length === 0 || v - out[out.length - 1]! >= minGap) out.push(v);
  return out;
}

export function buildTimeline(input: TimelineInput): Timeline {
  const L = input.lengthSec;
  const maxScroll = Math.max(0, input.maxScroll);
  const lead = Math.min(0.5, L * 0.05);
  const tail = Math.min(0.8, L * 0.08);
  const ease = input.easing === 'easeInOut' ? easeInOut : (x: number) => x;

  let points: number[]; // rest positions, first is 0, last is the end of the path
  let holdEach = 0;
  if (maxScroll <= 0) {
    return { at: () => 0, rests: [], duration: L };
  }
  if (input.type === 'tour') {
    const stops = uniqueSorted([0, ...input.stops], maxScroll, 40);
    points = stops.length > 1 ? pickEvenly(stops, 8) : [0, maxScroll];
    holdEach = ((L - lead - tail) * 0.35) / Math.max(1, points.length - 2 || 1);
  } else {
    const headings = input.pauseAtHeadings ? uniqueSorted(input.headings.filter((h) => h > 40 && h < maxScroll - 40), maxScroll, 200) : [];
    points = [0, ...pickEvenly(headings, 6), maxScroll];
    holdEach = points.length > 2 ? Math.min(0.8, ((L - lead - tail) * 0.3) / (points.length - 2)) : 0;
  }

  const inner = points.length - 2; // rests between start and end
  const moveTime = Math.max(0.1, L - lead - tail - holdEach * inner);
  const distances = points.slice(1).map((p, i) => Math.abs(p - points[i]!));
  const total = distances.reduce((a, b) => a + b, 0) || 1;

  const segments: Segment[] = [];
  const rests: number[] = [];
  let t = lead;
  for (let i = 0; i < distances.length; i++) {
    const dt = (moveTime * distances[i]!) / total;
    segments.push({ t0: t, t1: t + dt, y0: points[i]!, y1: points[i + 1]! });
    t += dt;
    if (i < distances.length - 1) {
      rests.push(t);
      t += holdEach;
    }
  }
  // Without pauses, a single eased glide reads better than per-segment easing.
  const single = inner === 0;

  return {
    duration: L,
    rests,
    at(time: number) {
      if (time <= lead) return 0;
      if (single) {
        const s = segments[0]!;
        const x = Math.min(1, Math.max(0, (time - s.t0) / (s.t1 - s.t0)));
        return s.y0 + (s.y1 - s.y0) * ease(x);
      }
      for (const s of segments) {
        if (time < s.t0) return s.y0;
        if (time <= s.t1) return s.y0 + (s.y1 - s.y0) * ease((time - s.t0) / (s.t1 - s.t0 || 1));
      }
      return points[points.length - 1]!;
    },
  };
}

/** Cursor position (fractions of the viewport) and click ripple progress at a time. */
export function cursorAt(time: number, rests: number[]): { x: number; y: number; ripple: number | null } {
  // A slow drift so the cursor feels held by a hand, plus a nudge toward the content at each rest.
  let x = 0.62 + 0.05 * Math.sin(time * 0.7) + 0.02 * Math.sin(time * 1.9);
  let y = 0.52 + 0.04 * Math.sin(time * 0.5 + 1) + 0.015 * Math.sin(time * 2.3);
  let ripple: number | null = null;
  for (const r of rests) {
    const d = time - r;
    if (d > -0.6 && d < 0.9) {
      const k = d < 0 ? 1 + d / 0.6 : d < 0.4 ? 1 : 1 - (d - 0.4) / 0.5;
      const kk = Math.max(0, Math.min(1, k));
      x += (0.4 - x) * 0.5 * kk;
      y += (0.36 - y) * 0.5 * kk;
      if (d >= 0 && d < 0.6) ripple = d / 0.6;
    }
  }
  return { x, y, ripple };
}
