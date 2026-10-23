import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acquireSlot, checkRateLimit, hashIp, publishJobEvent, readJobState, releaseSlot } from '../src';

const url = process.env.REDIS_URL || 'redis://localhost:6379';
let redis: Redis;
let available = false;

beforeAll(async () => {
  redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 1000 });
  try {
    await redis.connect();
    available = (await redis.ping()) === 'PONG';
  } catch {
    available = false;
    console.warn(`Redis not reachable at ${url}; skipping Redis tests (CI runs them with a Redis service).`);
  }
});
afterAll(() => redis.disconnect());

const id = () => `test-${Math.random().toString(36).slice(2)}`;

describe('rate limits (product spec §5)', () => {
  it('allows 30 captures per hour, then reports minutes until the window resets', async (ctx) => {
    if (!available) ctx.skip();
    const ip = id();
    const now = Date.UTC(2026, 9, 23, 10, 15, 0);
    for (let i = 0; i < 30; i++) expect((await checkRateLimit(redis, 'capture', ip, { perHour: 30, perDay: 150 }, now)).ok).toBe(true);
    const blocked = await checkRateLimit(redis, 'capture', ip, { perHour: 30, perDay: 150 }, now);
    expect(blocked).toEqual({ ok: false, retryMinutes: 45 });
    // next hour is fine again
    expect((await checkRateLimit(redis, 'capture', ip, { perHour: 30, perDay: 150 }, now + 3_600_000)).ok).toBe(true);
  });

  it('enforces the daily cap across hours', async (ctx) => {
    if (!available) ctx.skip();
    const ip = id();
    const start = Date.UTC(2026, 9, 23, 0, 0, 0);
    for (let h = 0; h < 4; h++) for (let i = 0; i < 5; i++) await checkRateLimit(redis, 'record', ip, { perHour: 5, perDay: 20 }, start + h * 3_600_000);
    const r = await checkRateLimit(redis, 'record', ip, { perHour: 5, perDay: 20 }, start + 5 * 3_600_000);
    expect(r.ok).toBe(false);
  });

  it('limits concurrent jobs per IP to 2', async (ctx) => {
    if (!available) ctx.skip();
    const ip = id();
    expect(await acquireSlot(redis, ip, 2)).toBe(true);
    expect(await acquireSlot(redis, ip, 2)).toBe(true);
    expect(await acquireSlot(redis, ip, 2)).toBe(false);
    await releaseSlot(redis, ip);
    expect(await acquireSlot(redis, ip, 2)).toBe(true);
  });
});

describe('job events', () => {
  it('replays the result before the terminal status for late subscribers', async (ctx) => {
    if (!available) ctx.skip();
    const job = id();
    await publishJobEvent(redis, job, { type: 'status', status: 'loading' });
    await publishJobEvent(redis, job, { type: 'result', assetUrl: '/x.png' });
    await publishJobEvent(redis, job, { type: 'status', status: 'done' });
    const state = await readJobState(redis, job);
    expect(state.map((e) => e.type)).toEqual(['result', 'status']);
    expect(state[1]).toEqual({ type: 'status', status: 'done' });
  });
});

describe('hashIp', () => {
  it('never returns the raw IP and rotates daily', () => {
    const a = hashIp('203.0.113.7', 'salt', new Date('2026-10-23T10:00:00Z'));
    const b = hashIp('203.0.113.7', 'salt', new Date('2026-10-24T10:00:00Z'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('203');
    expect(a).not.toBe(b);
  });
});
