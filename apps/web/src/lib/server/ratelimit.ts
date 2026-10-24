import { createHash } from 'node:crypto';
import { Redis } from 'ioredis';

/** sha256(ip + daily salt), never the raw IP (product spec §4.8, §5). */
export function hashIp(ip: string, salt: string, now = new Date()): string {
  return createHash('sha256').update(`${ip}|${salt}|${now.toISOString().slice(0, 10)}`).digest('hex');
}

export type Limit = { perHour: number; perDay: number };
export type LimitResult = { ok: true } | { ok: false; retryMinutes: number };

/**
 * Counters live in Redis when REDIS_URL is set (shared by every server instance), otherwise in this
 * instance's memory, which is a best-effort limit but needs no setup.
 */
interface Counters {
  get(keys: string[]): Promise<number[]>;
  incr(key: string, ttlSec: number): Promise<number>;
  decr(key: string): Promise<void>;
}

class MemoryCounters implements Counters {
  private m = new Map<string, { n: number; exp: number }>();
  private live(key: string) {
    const v = this.m.get(key);
    if (v && v.exp < Date.now()) this.m.delete(key);
    return this.m.get(key);
  }
  async get(keys: string[]) {
    return keys.map((k) => this.live(k)?.n ?? 0);
  }
  async incr(key: string, ttlSec: number) {
    const v = this.live(key) ?? { n: 0, exp: Date.now() + ttlSec * 1000 };
    v.n += 1;
    this.m.set(key, v);
    if (this.m.size > 50_000) this.m.clear(); // keep memory bounded
    return v.n;
  }
  async decr(key: string) {
    const v = this.live(key);
    if (v) v.n = Math.max(0, v.n - 1);
  }
}

class RedisCounters implements Counters {
  constructor(private r: Redis) {}
  async get(keys: string[]) {
    return (await this.r.mget(...keys)).map((v) => Number(v ?? 0));
  }
  async incr(key: string, ttlSec: number) {
    const [[, n]] = (await this.r.multi().incr(key).expire(key, ttlSec).exec()) as [[unknown, number], unknown];
    return n;
  }
  async decr(key: string) {
    await this.r.decr(key);
  }
}

let counters: Counters | null = null;
export function getCounters(): Counters {
  if (!counters) {
    const url = process.env.REDIS_URL;
    counters = url ? new RedisCounters(new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 3000, lazyConnect: false })) : new MemoryCounters();
  }
  return counters;
}

export function usingRedis(): boolean {
  return !!process.env.REDIS_URL;
}

/** Fixed hourly and daily windows; counts only allowed requests. */
export async function checkRateLimit(c: Counters, kind: string, ipHash: string, limit: Limit, now = Date.now()): Promise<LimitResult> {
  const hour = Math.floor(now / 3_600_000);
  const day = Math.floor(now / 86_400_000);
  const hKey = `weshot:rl:${kind}:h:${ipHash}:${hour}`;
  const dKey = `weshot:rl:${kind}:d:${ipHash}:${day}`;
  const [h = 0, d = 0] = await c.get([hKey, dKey]);
  if (d >= limit.perDay) return { ok: false, retryMinutes: Math.ceil(((day + 1) * 86_400_000 - now) / 60_000) };
  if (h >= limit.perHour) return { ok: false, retryMinutes: Math.ceil(((hour + 1) * 3_600_000 - now) / 60_000) };
  await c.incr(hKey, 3600);
  await c.incr(dKey, 86400);
  return { ok: true };
}

/** At most `max` captures running at once per IP. Returns a release function, or null when full. */
export async function acquireSlot(c: Counters, ipHash: string, max: number): Promise<(() => Promise<void>) | null> {
  const key = `weshot:active:${ipHash}`;
  const n = await c.incr(key, 120);
  if (n > max) {
    await c.decr(key);
    return null;
  }
  return () => c.decr(key);
}
