import type { CaptureSettings, JobEvent, RecordSettings, Rect } from '@weshot/shared';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { getRedis } from './redis';

export const CAPTURE_QUEUE = 'capture';
export const RECORD_QUEUE = 'record';

export type CaptureJobData = { jobId: string; ipHash: string; capture: CaptureSettings };
export type RecordJobData = {
  jobId: string;
  ipHash: string;
  capture: CaptureSettings;
  record: RecordSettings;
  templatePngKey: string;
  contentRect: Rect;
  contentRadius: number;
  output: { width: number; height: number };
};

const queues = new Map<string, Queue>();
export function getQueue(name: typeof CAPTURE_QUEUE | typeof RECORD_QUEUE): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: getRedis(),
      defaultJobOptions: { attempts: 1, removeOnComplete: { age: 3600, count: 1000 }, removeOnFail: { age: 86400 } },
    });
    queues.set(name, q);
  }
  return q;
}

// ---------- job events: Redis pub/sub for live updates, a hash for late subscribers ----------

export const eventChannel = (jobId: string) => `weshot:job:${jobId}:events`;
const stateKey = (jobId: string) => `weshot:job:${jobId}:state`;
const STATE_TTL = 3600;

/** Publish an event and remember the latest of each type, so an SSE stream that connects late can replay it. */
export async function publishJobEvent(redis: Redis, jobId: string, event: JobEvent): Promise<void> {
  const json = JSON.stringify(event);
  await redis.multi().hset(stateKey(jobId), event.type, json).expire(stateKey(jobId), STATE_TTL).publish(eventChannel(jobId), json).exec();
}

export async function readJobState(redis: Redis, jobId: string): Promise<JobEvent[]> {
  const state = await redis.hgetall(stateKey(jobId));
  // Status last: a terminal status closes the stream, so the result or error must be replayed first.
  const order: JobEvent['type'][] = ['progress', 'result', 'error', 'status'];
  return order.flatMap((t) => (state[t] ? [JSON.parse(state[t]) as JobEvent] : []));
}

export function isTerminal(e: JobEvent): boolean {
  return e.type === 'result' || e.type === 'error' || (e.type === 'status' && (e.status === 'done' || e.status === 'failed'));
}

// ---------- concurrency per IP (product spec §5) ----------

const activeKey = (ipHash: string) => `weshot:active:${ipHash}`;

/** Reserve a concurrent-job slot. Returns false when the IP already has `max` jobs running. */
export async function acquireSlot(redis: Redis, ipHash: string, max: number): Promise<boolean> {
  const n = await redis.incr(activeKey(ipHash));
  await redis.expire(activeKey(ipHash), 900);
  if (n > max) {
    await redis.decr(activeKey(ipHash));
    return false;
  }
  return true;
}

export async function releaseSlot(redis: Redis, ipHash: string): Promise<void> {
  const n = await redis.decr(activeKey(ipHash));
  if (n < 0) await redis.set(activeKey(ipHash), 0);
}

/** Lets the client stop a recording; the worker checks this flag between frames. */
export const stopKey = (jobId: string) => `weshot:job:${jobId}:stop`;
