'use client';

import { resolveCanvasSize } from '@weshot/frame';
import { errorMessage, type FrameSettings } from '@weshot/shared';
import { downloadCurrent } from './actions';
import { followJob, isApiError, type ApiError } from './capture';
import { renderExport } from './export';
import { sourceTitle, sourceUrl, useEditor } from './store';
import { getTurnstileToken } from './turnstile';
import { uploadFile } from './uploads';
import { track } from './analytics';

const MAX_VIDEO_SIDE = 1920;
let currentJob: string | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('weshot:stop-recording', () => {
    if (currentJob) void fetch(`/api/jobs/${encodeURIComponent(currentJob)}/stop`, { method: 'POST' });
  });
}

/** Even pixel sizes for H.264 (yuv420p), longest side at most 1920. */
export function videoSize(width: number, height: number): { width: number; height: number; k: number } {
  const k = Math.min(1, MAX_VIDEO_SIDE / Math.max(width, height));
  return { width: 2 * Math.round((width * k) / 2), height: 2 * Math.round((height * k) / 2), k };
}

/**
 * Product spec §3.3 / §4.7: render the frame template with the current settings (frozen at this moment),
 * upload it, and ask the worker to record the page into it.
 */
export async function startRecording(): Promise<void> {
  const s = useEditor.getState();
  if (s.source.kind !== 'url' || !s.source.bitmap || s.recording.kind === 'recording') return;
  const url = s.source.url;
  const capture = { ...(s.capturedWith ?? s.capture), url };
  const record = { ...s.record };
  // Videos have no alpha channel: a transparent background records on black.
  const frame: FrameSettings = structuredClone(s.frame);
  if (frame.background.kind === 'transparent') frame.background = { kind: 'solid', color: '#000000' };

  const total = record.lengthSec;
  s.setRecording({ kind: 'recording', elapsedSec: 0, totalSec: total, progress: 0, status: 'Loading page' });
  s.setVideo(null);
  track('recording_started', { format: record.format, type: record.type, lengthSec: record.lengthSec });

  const fail = (message: string) => {
    currentJob = null;
    const st = useEditor.getState();
    st.setRecording({ kind: 'error', message });
    track('recording_failed');
    st.showToast(message);
  };

  try {
    const sourceSize = capture.viewport;
    const canvas = resolveCanvasSize(frame, sourceSize);
    const out = videoSize(canvas.width, canvas.height);
    const tpl = await renderExport({
      settings: frame,
      source: null,
      backgroundImage: frame.background.kind === 'image' ? s.backgroundImage : null,
      format: 'png',
      scale: out.k,
      size: { width: out.width / out.k, height: out.height / out.k },
      resources: { url: sourceUrl(s.source), title: sourceTitle(s.source), sourceSize },
    });
    const templatePngKey = await uploadFile('template', tpl.blob, 'image/png');
    const token = await getTurnstileToken().catch(() => null);
    if (!token) return fail(errorMessage('BOT_PROTECTION'));
    const res = await fetch('/api/record', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        capture,
        record,
        templatePngKey,
        contentRect: {
          x: tpl.contentRect.x * out.k,
          y: tpl.contentRect.y * out.k,
          width: tpl.contentRect.width * out.k,
          height: tpl.contentRect.height * out.k,
        },
        contentRadius: tpl.contentRadius * out.k,
        output: { width: out.width, height: out.height },
        turnstileToken: token,
      }),
    });
    const json = (await res.json()) as { jobId: string } | ApiError;
    if (isApiError(json)) return fail(json.message);
    currentJob = json.jobId;

    const handle = { es: null as EventSource | null };
    const result = await followJob(
      json.jobId,
      (e) => {
        const st = useEditor.getState();
        const r = st.recording;
        if (r.kind !== 'recording') return;
        if (e.type === 'progress') {
          st.setRecording({ ...r, progress: e.progress, elapsedSec: e.elapsedSec ?? r.elapsedSec });
        } else if (e.type === 'status') {
          const status = e.status === 'encoding' ? 'Encoding' : e.status === 'capturing' ? 'Recording' : 'Loading page';
          st.setRecording({ ...r, status, ...(e.status === 'encoding' ? { elapsedSec: r.totalSec } : {}) });
        }
      },
      handle,
    );
    currentJob = null;
    const st = useEditor.getState();
    st.setVideo({ url: result.assetUrl, format: record.format, width: result.width ?? out.width, height: result.height ?? out.height });
    st.setExportFormat(record.format);
    st.setRecording({ kind: 'idle' });
    track('recording_done', { format: record.format });
    st.showToast('Video ready', { label: `Download ${record.format.toUpperCase()}`, run: () => void downloadCurrent() });
  } catch (e) {
    const err = e as { message?: string };
    fail(err.message ?? errorMessage('INTERNAL'));
  }
}
