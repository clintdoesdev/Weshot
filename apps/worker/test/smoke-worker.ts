/**
 * Local full-stack smoke test worker: the real BullMQ consumers, but with the SSRF policy that treats
 * 127.0.0.2 as public so a site on this machine can be captured. Never used in production.
 *
 *   tsx test/smoke-worker.ts
 */
import { CAPTURE_QUEUE, RECORD_QUEUE, createRedis } from '@weshot/server';
import { Worker } from 'bullmq';
import { runCaptureJob } from '../src/jobs/capture-job';
import { runRecordJob } from '../src/jobs/record-job';
import { testPolicy, testResolver } from './server';

const port = process.env.SMOKE_SITE_PORT ?? '';
const deps = { resolver: testResolver(), allowed: testPolicy, adblock: false };
new Worker(CAPTURE_QUEUE, (job) => runCaptureJob(job, deps), { connection: createRedis(), concurrency: 2 });
new Worker(RECORD_QUEUE, (job) => runRecordJob(job, deps), { connection: createRedis(), concurrency: 1 });
console.log(`smoke worker ready (site port ${port})`);
