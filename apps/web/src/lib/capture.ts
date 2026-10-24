'use client';

import { errorMessage, type CaptureSettings } from '@weshot/shared';
import { track } from './analytics';
import { useEditor, type CaptureStep } from './store';
import { getTurnstileToken } from './turnstile';

export type ApiError = { code: string; message: string; minutes?: number };

export function isApiError<T>(x: T | ApiError): x is ApiError {
  return typeof x === 'object' && x !== null && 'code' in x && 'message' in x;
}

let active: { cancelled: boolean; controller: AbortController } | null = null;

/**
 * Capture a link and frame it (product spec §3.1). The server answers with the image itself. While it works,
 * the status pill walks through "Loading page" → "Waiting for fonts" → "Framing" on a timer that matches a
 * typical capture.
 */
export async function startCapture(url: string): Promise<void> {
  const s = useEditor.getState();
  if (active) {
    active.cancelled = true;
    active.controller.abort();
  }
  const run = { cancelled: false, controller: new AbortController() };
  active = run;
  const capture: CaptureSettings = { ...s.capture, url };
  s.setSource({ kind: 'url', url, bitmap: null, title: null, truncated: false });
  s.setPhase({ kind: 'capturing', step: 'loading' });

  const step = (st: CaptureStep) => {
    if (!run.cancelled && useEditor.getState().phase.kind === 'capturing') useEditor.getState().setPhase({ kind: 'capturing', step: st });
  };
  const timers = [setTimeout(() => step('fonts'), 3500 + capture.delayMs / 2), setTimeout(() => step('framing'), 6000 + capture.delayMs)];
  const fail = (code: string, message: string) => {
    if (run.cancelled) return;
    useEditor.getState().setPhase({ kind: 'error', code, message });
    track('capture_failed', { code });
  };

  try {
    let token: string | undefined;
    try {
      token = await getTurnstileToken();
    } catch {
      return fail('BOT_PROTECTION', errorMessage('BOT_PROTECTION'));
    }
    let res: Response;
    try {
      res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ capture, ...(token ? { turnstileToken: token } : {}) }),
        signal: run.controller.signal,
      });
    } catch {
      return fail('INTERNAL', 'WeShot is offline. Check your connection and try again.');
    }
    if (run.cancelled) return;
    if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) {
      const err = (await res.json().catch(() => null)) as ApiError | null;
      // Serverless time-outs answer with an HTML page, not our JSON.
      return err && isApiError(err) ? fail(err.code, err.message) : fail('TIMEOUT', errorMessage('TIMEOUT'));
    }
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    if (run.cancelled) return bitmap.close();
    const title = decodeURIComponent(res.headers.get('x-weshot-title') ?? '') || null;
    const truncated = res.headers.get('x-weshot-truncated') === '1';
    const st = useEditor.getState();
    st.setSource({ kind: 'url', url, bitmap, title, truncated });
    const { url: _u, ...options } = capture;
    st.setCapturedWith(options);
    st.setPhase({ kind: 'idle' });
    track('capture_succeeded');
    if (truncated) st.showToast('This page is taller than 16,000 px, so the capture stops there.');
  } catch {
    fail('INTERNAL', errorMessage('INTERNAL'));
  } finally {
    timers.forEach(clearTimeout);
    if (active === run) active = null;
  }
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
