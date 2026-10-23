import { renderFrame, type Ctx2D } from '@weshot/frame';
import { MIME_TYPES } from '@weshot/shared';
import type { RenderJob } from './types';

/**
 * Renders one export. Runs inside the export worker, or on the main thread when workers or
 * OffscreenCanvas are unavailable. Either way it is the same renderFrame call as the preview.
 */
export async function runRenderJob(job: RenderJob, canvas: OffscreenCanvas | HTMLCanvasElement) {
  const { output } = job;
  canvas.width = Math.round(output.width * output.scale);
  canvas.height = Math.round(output.height * output.scale);
  // willReadFrequently keeps the canvas on the CPU rasterizer, the same one the preview uses.
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as Ctx2D | null;
  if (!ctx) throw new Error('No 2D context');
  const result = renderFrame(ctx, job.source, job.settings, output, { ...job.resources, backgroundImage: job.backgroundImage });
  if (job.format === 'jpg') {
    // JPG has no alpha: flatten transparent areas onto black (DECISIONS.md).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  const type = MIME_TYPES[job.format];
  const quality = job.quality ?? (job.format === 'png' ? undefined : 0.92);
  let blob: Blob | null;
  if ('convertToBlob' in canvas) {
    blob = await canvas.convertToBlob(quality === undefined ? { type } : { type, quality });
  } else {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  }
  if (!blob) throw new Error('Encoding failed');
  return { blob, contentRect: result.contentRect, contentRadius: result.contentRadius };
}
