import { describe, expect, it } from 'vitest';
import { acquireSlot, checkRateLimit, getCounters, hashIp } from './ratelimit';

describe('rate limits without Redis (in-memory)', () => {
  it('allows 30 captures per hour, then reports minutes until the window resets', async () => {
    const c = getCounters();
    const now = Date.UTC(2026, 9, 23, 10, 15, 0);
    for (let i = 0; i < 30; i++) expect((await checkRateLimit(c, 'capture', 'ip1', { perHour: 30, perDay: 150 }, now)).ok).toBe(true);
    expect(await checkRateLimit(c, 'capture', 'ip1', { perHour: 30, perDay: 150 }, now)).toEqual({ ok: false, retryMinutes: 45 });
  });
  it('limits concurrent captures per IP', async () => {
    const c = getCounters();
    const a = await acquireSlot(c, 'ip2', 2);
    const b = await acquireSlot(c, 'ip2', 2);
    expect(a && b).toBeTruthy();
    expect(await acquireSlot(c, 'ip2', 2)).toBeNull();
    await a!();
    expect(await acquireSlot(c, 'ip2', 2)).not.toBeNull();
  });
  it('hashes IPs with a daily salt', () => {
    const a = hashIp('203.0.113.7', 's', new Date('2026-10-23T10:00:00Z'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(hashIp('203.0.113.7', 's', new Date('2026-10-24T10:00:00Z')));
  });
});
