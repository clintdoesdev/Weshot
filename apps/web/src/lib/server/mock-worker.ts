import type { JobEvent } from '@weshot/shared';
import { errorMessage } from '@weshot/shared';

/**
 * In-memory stand-in for the BullMQ worker, used by the Playwright e2e suite (E2E_MOCK_WORKER=1, product spec §9).
 * Hosts pick the outcome: "timeout.test" → TIMEOUT, "bot.test" → BOT_CHECK, "error500.test" → HTTP_5XX,
 * "private.test" → BLOCKED_HOST; anything else succeeds with a fixture image.
 */
type Listener = (e: JobEvent) => void;
const g = globalThis as unknown as { __weshotMock?: Map<string, { events: JobEvent[]; listeners: Set<Listener> }> };
const jobs = (g.__weshotMock ??= new Map());

function emit(id: string, e: JobEvent) {
  const job = jobs.get(id);
  if (!job) return;
  job.events.push(e);
  for (const l of job.listeners) l(e);
}

export function mockEnqueue(id: string, kind: 'capture' | 'record', url: string, extra: { lengthSec?: number; format?: string } = {}) {
  jobs.set(id, { events: [], listeners: new Set() });
  const host = new URL(url).hostname;
  const steps: Array<[number, JobEvent]> = [];
  const fail = (code: string, status?: number): JobEvent => ({
    type: 'error',
    code,
    message: errorMessage(code, status !== undefined ? { status } : {}),
    ...(status !== undefined ? { status } : {}),
  });
  if (kind === 'capture') {
    steps.push([150, { type: 'status', status: 'loading' }]);
    if (host === 'timeout.test') steps.push([300, fail('TIMEOUT')]);
    else if (host === 'bot.test') steps.push([300, fail('BOT_CHECK')]);
    else if (host === 'error500.test') steps.push([300, fail('HTTP_5XX', 503)]);
    else if (host === 'private.test') steps.push([300, fail('BLOCKED_HOST')]);
    else {
      steps.push([300, { type: 'status', status: 'fonts' }]);
      steps.push([450, { type: 'status', status: 'capturing' }]);
      steps.push([600, { type: 'result', assetUrl: '/e2e/capture.png', width: 1440, height: 900, title: 'Mock page', truncated: false }]);
      steps.push([650, { type: 'status', status: 'done' }]);
    }
  } else {
    const total = extra.lengthSec ?? 5;
    steps.push([100, { type: 'status', status: 'loading' }]);
    steps.push([200, { type: 'status', status: 'capturing' }]);
    for (let i = 1; i <= 5; i++) steps.push([200 + i * 150, { type: 'progress', progress: i / 6, elapsedSec: (total * i) / 6, totalSec: total }]);
    steps.push([1100, { type: 'status', status: 'encoding' }]);
    steps.push([1300, { type: 'result', assetUrl: `/e2e/video.${extra.format ?? 'mp4'}`, width: 1600, height: 900 }]);
    steps.push([1350, { type: 'status', status: 'done' }]);
  }
  const last = steps[steps.length - 1]!;
  if (last[1].type === 'error') steps.push([last[0] + 20, { type: 'status', status: 'failed' }]);
  for (const [ms, e] of steps) setTimeout(() => emit(id, e), ms);
}

export function mockSubscribe(id: string, listener: Listener): { replay: JobEvent[]; unsubscribe: () => void } | null {
  const job = jobs.get(id);
  if (!job) return null;
  job.listeners.add(listener);
  return { replay: [...job.events], unsubscribe: () => job.listeners.delete(listener) };
}
