import { createHash } from 'node:crypto';
import type { Redis } from 'ioredis';

/** sha256(ip + daily salt), never the raw IP (product spec §4.8, §5). */
export function hashIp(ip: string, salt: string, now = new Date()): string {
  return createHash('sha256').update(`${ip}|${salt}|${now.toISOString().slice(0, 10)}`).digest('hex');
}

export type Limit = { perHour: number; perDay: number };
export type LimitResult = { ok: true } | { ok: false; retryMinutes: number };

/**
 * Fixed-window counters per hour and per day. Counts only when allowed, so a blocked request does not
 * push the window further out.
 */
export async function checkRateLimit(redis: Redis, kind: string, ipHash: string, limit: Limit, now = Date.now()): Promise<LimitResult> {
  const hour = Math.floor(now / 3_600_000);
  const day = Math.floor(now / 86_400_000);
  const hKey = `weshot:rl:${kind}:h:${ipHash}:${hour}`;
  const dKey = `weshot:rl:${kind}:d:${ipHash}:${day}`;
  const [h, d] = (await redis.mget(hKey, dKey)).map((v) => Number(v ?? 0));
  if ((d ?? 0) >= limit.perDay) return { ok: false, retryMinutes: Math.ceil(((day + 1) * 86_400_000 - now) / 60_000) };
  if ((h ?? 0) >= limit.perHour) return { ok: false, retryMinutes: Math.ceil(((hour + 1) * 3_600_000 - now) / 60_000) };
  await redis.multi().incr(hKey).expire(hKey, 3600).incr(dKey).expire(dKey, 86400).exec();
  return { ok: true };
}
