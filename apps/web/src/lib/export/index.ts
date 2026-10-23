'use client';

import { resolveCanvasSize, type FrameResources } from '@weshot/frame';
import type { FrameSettings, ImageFormat } from '@weshot/shared';
import { runRenderJob } from './render-job';
import type { RenderJob, RenderRequest, RenderResponse } from './types';

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map<number, { resolve: (r: RenderResponse) => void }>();

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<RenderResponse>) => {
        pending.get(e.data.id)?.resolve(e.data);
        pending.delete(e.data.id);
      };
      worker.onerror = () => {
        workerBroken = true;
        worker?.terminate();
        worker = null;
        for (const [id, p] of pending) p.resolve({ id, ok: false, error: 'worker-crashed' });
        pending.clear();
      };
    } catch {
      workerBroken = true;
      return null;
    }
  }
  return worker;
}

/** Largest canvas the browser will reliably allocate. iOS Safari caps canvases at 16.7 MP. */
function maxCanvasArea(): number {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (iOS) return 16_777_216;
  }
  return 268_435_456;
}
const MAX_SIDE = 16_384;

/** Reduce the export scale when the requested size would exceed canvas limits. */
export function safeScale(width: number, height: number, scale: number): number {
  let s = scale;
  const area = maxCanvasArea();
  while (s > 0.25 && (width * s > MAX_SIDE || height * s > MAX_SIDE || width * s * height * s > area)) s /= 2;
  return s;
}

export type ExportInput = {
  settings: FrameSettings;
  source: ImageBitmap | null;
  backgroundImage: ImageBitmap | null;
  format: ImageFormat;
  scale: number;
  resources: Omit<FrameResources, 'backgroundImage'>;
  /** Force an output size (video templates); defaults to the canvas setting. */
  size?: { width: number; height: number };
};

export type ExportResult = {
  blob: Blob;
  width: number;
  height: number;
  scale: number;
  contentRect: { x: number; y: number; width: number; height: number };
  contentRadius: number;
};

/** Render an export off the main thread with OffscreenCanvas; falls back to the main thread. */
export async function renderExport(input: ExportInput): Promise<ExportResult> {
  const srcSize = input.source ? { width: input.source.width, height: input.source.height } : (input.resources.sourceSize ?? null);
  const size = input.size ?? resolveCanvasSize(input.settings, srcSize);
  const scale = safeScale(size.width, size.height, input.scale);
  const job: RenderJob = {
    settings: input.settings,
    source: input.source,
    backgroundImage: input.backgroundImage,
    output: { ...size, scale },
    format: input.format,
    resources: input.resources,
  };
  const w = getWorker();
  if (w) {
    // Copies are transferred to the worker; the editor keeps its own bitmaps.
    const source = job.source ? await createImageBitmap(job.source) : null;
    const backgroundImage = job.backgroundImage ? await createImageBitmap(job.backgroundImage) : null;
    const id = nextId++;
    const req: RenderRequest = { ...job, source, backgroundImage, id };
    const transfer = [source, backgroundImage].filter((b): b is ImageBitmap => b !== null);
    const res = await new Promise<RenderResponse>((resolve) => {
      pending.set(id, { resolve });
      w.postMessage(req, transfer);
    });
    if (res.ok) {
      return {
        blob: res.blob,
        width: Math.round(size.width * scale),
        height: Math.round(size.height * scale),
        scale,
        contentRect: res.contentRect,
        contentRadius: res.contentRadius,
      };
    }
    if (res.error !== 'worker-crashed') throw new Error(res.error);
  }
  const out = await runRenderJob(job, document.createElement('canvas'));
  return { ...out, width: Math.round(size.width * scale), height: Math.round(size.height * scale), scale };
}
