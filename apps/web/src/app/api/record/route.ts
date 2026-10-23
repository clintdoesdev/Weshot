import { RECORD_QUEUE, acquireSlot, checkRateLimit, getQueue, getRedis, getStorage, releaseSlot } from '@weshot/server';
import { LIMITS, normalizeUrl, recordRequestSchema } from '@weshot/shared';
import { NextResponse } from 'next/server';
import { isBlockedDomain } from '@/lib/server/blocklist';
import { db } from '@/lib/server/db';
import { mockEnqueue } from '@/lib/server/mock-worker';
import { apiError, clientIp, ipHashOf, isMockWorker } from '@/lib/server/request';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { TEMPLATE_MAX_BYTES } from '@/lib/server/limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/record — enqueue a scroll recording (product spec §4.5, §4.7). */
export async function POST(req: Request) {
  const parsed = recordRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', 400);
  const { capture, record, templatePngKey, contentRect, contentRadius, output, turnstileToken } = parsed.data;
  const url = normalizeUrl(capture.url);
  if (!url) return apiError('INVALID_URL', 400);
  if (isBlockedDomain(new URL(url).hostname)) return apiError('BLOCKED_SITE', 403);
  if (output.width % 2 || output.height % 2) return apiError('BAD_REQUEST', 400);

  if (isMockWorker()) {
    const jobId = crypto.randomUUID();
    mockEnqueue(jobId, 'record', url, { lengthSec: record.lengthSec, format: record.format });
    return NextResponse.json({ jobId });
  }

  if (!(await verifyTurnstile(turnstileToken, clientIp(req)))) return apiError('BOT_PROTECTION', 403);
  const size = await getStorage().size(templatePngKey);
  if (size === null || size > TEMPLATE_MAX_BYTES) return apiError('BAD_REQUEST', 400);

  const ipHash = ipHashOf(req);
  const redis = getRedis();
  const limit = await checkRateLimit(redis, 'record', ipHash, { perHour: LIMITS.recordingsPerHour, perDay: LIMITS.recordingsPerDay });
  if (!limit.ok) return apiError('RATE_LIMIT', 429, { minutes: limit.retryMinutes });
  if (!(await acquireSlot(redis, ipHash, LIMITS.concurrentJobsPerIp))) return apiError('RATE_LIMIT', 429, { minutes: 1 });

  try {
    const job = await db.job.create({ data: { kind: 'RECORD', status: 'queued', url, ipHash } });
    await getQueue(RECORD_QUEUE).add(
      'record',
      { jobId: job.id, ipHash, capture: { ...capture, url }, record, templatePngKey, contentRect, contentRadius: contentRadius ?? 0, output },
      { jobId: job.id },
    );
    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error('[record] enqueue failed', err);
    await releaseSlot(redis, ipHash);
    return apiError('INTERNAL', 500);
  }
}
