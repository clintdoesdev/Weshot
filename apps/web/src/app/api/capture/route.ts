import { randomUUID } from 'node:crypto';
import { CAPTURE_QUEUE, acquireSlot, checkRateLimit, getQueue, getRedis, releaseSlot } from '@weshot/server';
import { LIMITS, captureRequestSchema, normalizeUrl } from '@weshot/shared';
import { NextResponse } from 'next/server';
import { isBlockedDomain } from '@/lib/server/blocklist';
import { db } from '@/lib/server/db';
import { mockEnqueue } from '@/lib/server/mock-worker';
import { apiError, clientIp, ipHashOf, isMockWorker } from '@/lib/server/request';
import { verifyTurnstile } from '@/lib/server/turnstile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/capture — validate, Turnstile, rate-limit, enqueue (product spec §4.5). */
export async function POST(req: Request) {
  const parsed = captureRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', 400);
  const { capture, turnstileToken } = parsed.data;
  const url = normalizeUrl(capture.url);
  if (!url) return apiError('INVALID_URL', 400);
  const host = new URL(url).hostname;
  if (isBlockedDomain(host)) return apiError('BLOCKED_SITE', 403);

  if (isMockWorker()) {
    // e2e: "ratelimit.test" shows the rate-limit copy under the bar.
    if (host === 'ratelimit.test') return apiError('RATE_LIMIT', 429, { minutes: 42 });
    const jobId = randomUUID();
    mockEnqueue(jobId, 'capture', url);
    return NextResponse.json({ jobId });
  }

  if (!(await verifyTurnstile(turnstileToken, clientIp(req)))) return apiError('BOT_PROTECTION', 403);

  const ipHash = ipHashOf(req);
  const redis = getRedis();
  const limit = await checkRateLimit(redis, 'capture', ipHash, { perHour: LIMITS.capturesPerHour, perDay: LIMITS.capturesPerDay });
  if (!limit.ok) return apiError('RATE_LIMIT', 429, { minutes: limit.retryMinutes });
  if (!(await acquireSlot(redis, ipHash, LIMITS.concurrentJobsPerIp))) return apiError('RATE_LIMIT', 429, { minutes: 1 });

  try {
    const job = await db.job.create({ data: { kind: 'CAPTURE', status: 'queued', url, ipHash } });
    await getQueue(CAPTURE_QUEUE).add('capture', { jobId: job.id, ipHash, capture: { ...capture, url } }, { jobId: job.id });
    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error('[capture] enqueue failed', err);
    await releaseSlot(redis, ipHash);
    return apiError('INTERNAL', 500);
  }
}
