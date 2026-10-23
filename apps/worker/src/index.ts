import { CAPTURE_QUEUE, RECORD_QUEUE, createRedis } from '@weshot/server';
import { Worker } from 'bullmq';
import { getBlocker } from './adblock';
import { db } from './db';
import { runCaptureJob } from './jobs/capture-job';
import { runRecordJob } from './jobs/record-job';

const concurrency = Number(process.env.WORKER_CONCURRENCY) || 4;

// Warm the filter lists so the first capture does not pay for the download.
void getBlocker('ads');
void getBlocker('full');

const captureWorker = new Worker(CAPTURE_QUEUE, (job) => runCaptureJob(job), { connection: createRedis(), concurrency });
// Recordings are CPU-heavy (Chromium + FFmpeg); run fewer at once.
const recordWorker = new Worker(RECORD_QUEUE, (job) => runRecordJob(job), {
  connection: createRedis(),
  concurrency: Math.max(1, Math.floor(concurrency / 2)),
  lockDuration: 180_000,
});

for (const w of [captureWorker, recordWorker]) {
  w.on('failed', (job, err) => console.error(`[${w.name}] job ${job?.id} failed:`, err.message));
  w.on('error', (err) => console.error(`[${w.name}]`, err.message));
}

console.log(`WeShot worker ready (concurrency ${concurrency})`);

async function shutdown() {
  console.log('Shutting down worker');
  await Promise.allSettled([captureWorker.close(), recordWorker.close()]);
  await db.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
