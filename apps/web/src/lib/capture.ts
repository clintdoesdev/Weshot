'use client';

import { errorMessage, type CaptureSettings, type JobEvent } from '@weshot/shared';
import { useEditor, type CaptureStep } from './store';
import { getTurnstileToken } from './turnstile';
import { track } from './analytics';

const STEP: Partial<Record<string, CaptureStep>> = { queued: 'loading', loading: 'loading', fonts: 'fonts', capturing: 'framing' };

let active: { es: EventSource | null; cancelled: boolean } | null = null;

export type ApiError = { code: string; message: string; minutes?: number };

async function postJson<T>(url: string, body: unknown): Promise<T | ApiError> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return (await res.json()) as T | ApiError;
  } catch {
    return { code: 'INTERNAL', message: 'WeShot is offline. Check your connection and try again.' };
  }
}

export function isApiError<T>(x: T | ApiError): x is ApiError {
  return typeof x === 'object' && x !== null && 'code' in x && 'message' in x;
}

/**
 * Follow a job's Server-Sent Events until it finishes. Resolves with the result event or rejects with the error.
 * EventSource reconnects on its own; the server replays the latest state on reconnect.
 */
export function followJob(
  jobId: string,
  onEvent: (e: JobEvent) => void,
  handle: { es: EventSource | null },
  /** Give up when nothing arrives for this long (a worker that died mid-job). */
  idleMs?: number,
): Promise<Extract<JobEvent, { type: 'result' }>> {
  return new Promise((resolve, reject) => {
    const es = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/events`);
    handle.es = es;
    let result: Extract<JobEvent, { type: 'result' }> | null = null;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      if (!idleMs) return;
      clearTimeout(idle);
      idle = setTimeout(() => finish(() => reject({ type: 'error', code: 'CAPTURE_UNAVAILABLE', message: errorMessage('CAPTURE_UNAVAILABLE') })), idleMs);
    };
    arm();
    const finish = (fn: () => void) => {
      clearTimeout(idle);
      es.close();
      fn();
    };
    const on = (type: JobEvent['type']) =>
      es.addEventListener(type, (m) => {
        const e = JSON.parse((m as MessageEvent<string>).data) as JobEvent;
        if (!(e.type === 'status' && e.status === 'queued')) arm();
        onEvent(e);
        if (e.type === 'result') result = e;
        if (e.type === 'error') finish(() => reject(e));
        if (e.type === 'status' && e.status === 'done' && result) finish(() => resolve(result!));
        if (e.type === 'status' && e.status === 'failed' && !result) finish(() => reject({ type: 'error', code: 'INTERNAL', message: errorMessage('INTERNAL') }));
      });
    (['status', 'progress', 'result', 'error'] as const).forEach(on);
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) reject({ type: 'error', code: 'INTERNAL', message: errorMessage('INTERNAL') });
    };
  });
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  // Fetch as a blob so the canvas stays untainted for export, whatever the CDN's CORS headers say.
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`asset ${res.status}`);
  return createImageBitmap(await res.blob());
}

/** Product spec §3.1: capture a link and frame it. */
export async function startCapture(url: string): Promise<void> {
  const s = useEditor.getState();
  if (active) {
    active.cancelled = true;
    active.es?.close();
  }
  const run = { es: null as EventSource | null, cancelled: false };
  active = run;
  const capture: CaptureSettings = { ...s.capture, url };
  s.setSource({ kind: 'url', url, bitmap: null, title: null, truncated: false });
  s.setVideo(null);
  s.setPhase({ kind: 'capturing', step: 'loading' });

  const fail = (code: string, message: string) => {
    if (run.cancelled) return;
    useEditor.getState().setPhase({ kind: 'error', code, message });
    track('capture_failed', { code });
  };

  let token: string;
  try {
    token = await getTurnstileToken();
  } catch {
    return fail('BOT_PROTECTION', errorMessage('BOT_PROTECTION'));
  }
  const res = await postJson<{ jobId: string }>('/api/capture', { capture, turnstileToken: token });
  if (run.cancelled) return;
  if (isApiError(res)) return fail(res.code, res.message);

  try {
    const result = await followJob(
      res.jobId,
      (e) => {
        if (run.cancelled) return;
        if (e.type === 'status' && STEP[e.status]) useEditor.getState().setPhase({ kind: 'capturing', step: STEP[e.status]! });
      },
      run,
      90_000,
    );
    if (run.cancelled) return;
    const bitmap = await loadBitmap(result.assetUrl);
    if (run.cancelled) return bitmap.close();
    const st = useEditor.getState();
    st.setSource({ kind: 'url', url, bitmap, title: result.title ?? null, truncated: !!result.truncated });
    st.setCapturedWith(withoutUrl(capture));
    st.setPhase({ kind: 'idle' });
    track('capture_succeeded');
    if (result.truncated) st.showToast('This page is taller than 16,000 px, so the capture stops there.');
  } catch (e) {
    const err = e as { code?: string; message?: string };
    fail(err.code ?? 'INTERNAL', err.message ?? errorMessage('INTERNAL'));
  } finally {
    if (active === run) active = null;
  }
}

function withoutUrl(c: CaptureSettings) {
  const { url: _url, ...rest } = c;
  return rest;
}

export async function retryCapture(): Promise<void> {
  const s = useEditor.getState();
  const url = s.source.kind === 'url' ? s.source.url : s.barValue;
  if (url) await startCapture(/^https?:\/\//.test(url) ? url : `https://${url}`);
}

/** Re-capture with the changed capture settings (UI spec §4: never automatic). */
export async function recapture(): Promise<void> {
  await retryCapture();
}
