import { dateKey, getRedis, getStorage, publishJobEvent, releaseSlot, type CaptureJobData } from '@weshot/server';
import type { Job } from 'bullmq';
import { capturePage, type CaptureDeps } from '../capture';
import { updateJob } from '../db';
import { CaptureError } from '../errors';
import { reportError } from '../monitoring';

/** Capture worker (product spec §4.6): load, screenshot, upload to R2, emit progress over Redis. */
export async function runCaptureJob(job: Job<CaptureJobData>, deps: CaptureDeps = {}): Promise<void> {
  const { jobId, ipHash, capture } = job.data;
  const redis = getRedis();
  const started = Date.now();
  const emit = (e: Parameters<typeof publishJobEvent>[2]) => publishJobEvent(redis, jobId, e);
  try {
    const result = await capturePage(capture, {
      ...deps,
      onStatus: async (status) => {
        await emit({ type: 'status', status });
        await updateJob(jobId, { status });
      },
    });
    const key = `captures/${dateKey()}/${jobId}.png`;
    const storage = getStorage();
    await storage.put(key, result.png, 'image/png');
    await emit({
      type: 'result',
      assetUrl: storage.publicUrl(key),
      width: result.width,
      height: result.height,
      title: result.title,
      truncated: result.truncated,
    });
    await emit({ type: 'status', status: 'done' });
    await updateJob(jobId, { status: 'done', assetKey: key, durationMs: Date.now() - started });
  } catch (err) {
    const e = err instanceof CaptureError ? err : new CaptureError('INTERNAL');
    if (!(err instanceof CaptureError)) {
      console.error(`[capture] ${jobId}`, err);
      reportError(err, { job: 'capture', jobId });
    }
    await emit({ type: 'error', code: e.code, message: e.message, ...(e.status !== undefined ? { status: e.status } : {}) });
    await emit({ type: 'status', status: 'failed' });
    await updateJob(jobId, { status: 'failed', errorCode: e.code, durationMs: Date.now() - started });
  } finally {
    await releaseSlot(redis, ipHash);
  }
}
