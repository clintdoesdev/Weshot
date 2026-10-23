import { dateKey, getRedis, getStorage, publishJobEvent, releaseSlot, stopKey, type RecordJobData } from '@weshot/server';
import type { Job } from 'bullmq';
import type { CaptureDeps } from '../capture';
import { updateJob } from '../db';
import { CaptureError } from '../errors';
import { reportError } from '../monitoring';
import { recordPage } from '../record/recorder';

/** Recording worker (product spec §4.7). Uploads to recordings/{date}/{jobId}.{ext}. */
export async function runRecordJob(job: Job<RecordJobData>, deps: CaptureDeps = {}): Promise<void> {
  const { jobId, ipHash, capture, record, templatePngKey, contentRect, output } = job.data;
  const redis = getRedis();
  const storage = getStorage();
  const started = Date.now();
  const emit = (e: Parameters<typeof publishJobEvent>[2]) => publishJobEvent(redis, jobId, e);
  try {
    const templatePng = await storage.get(templatePngKey);
    if (!templatePng) throw new CaptureError('INTERNAL');
    const result = await recordPage(
      { capture, record, templatePng, contentRect, output },
      {
        ...deps,
        onStatus: async (status) => {
          await emit({ type: 'status', status });
          await updateJob(jobId, { status });
        },
        onProgress: (p) => emit({ type: 'progress', ...p }),
        shouldStop: async () => (await redis.exists(stopKey(jobId))) === 1,
      },
    );
    const key = `recordings/${dateKey()}/${jobId}.${result.ext}`;
    await storage.put(key, result.file, result.contentType);
    await emit({ type: 'progress', progress: 1 });
    await emit({ type: 'result', assetUrl: storage.publicUrl(key), width: result.width, height: result.height });
    await emit({ type: 'status', status: 'done' });
    await updateJob(jobId, { status: 'done', assetKey: key, durationMs: Date.now() - started });
  } catch (err) {
    const e = err instanceof CaptureError ? err : new CaptureError('INTERNAL');
    if (!(err instanceof CaptureError)) {
      console.error(`[record] ${jobId}`, err);
      reportError(err, { job: 'record', jobId });
    }
    await emit({ type: 'error', code: e.code, message: e.message, ...(e.status !== undefined ? { status: e.status } : {}) });
    await emit({ type: 'status', status: 'failed' });
    await updateJob(jobId, { status: 'failed', errorCode: e.code, durationMs: Date.now() - started });
  } finally {
    await releaseSlot(redis, ipHash);
    await storage.delete(templatePngKey).catch(() => undefined);
  }
}
