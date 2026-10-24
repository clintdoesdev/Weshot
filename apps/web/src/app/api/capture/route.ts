import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CaptureError, capturePage } from '@weshot/capture';
import { LIMITS, captureRequestSchema, normalizeUrl } from '@weshot/shared';
import { isBlockedDomain } from '@/lib/server/blocklist';
import { acquireSlot, checkRateLimit, getCounters } from '@/lib/server/ratelimit';
import { apiError, clientIp, ipHashOf, isMockCapture } from '@/lib/server/request';
import { verifyTurnstile } from '@/lib/server/turnstile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Navigation can take 30 s, plus fonts, lazy images and the delay setting.
export const maxDuration = 60;

/** Serverless responses are capped at 4.5 MB; leave room for headers. */
const MAX_BYTES = 4_200_000;

/**
 * POST /api/capture — snap a website. Runs headless Chromium in this function (behind the SSRF proxy)
 * and answers with the image itself; the title and a truncation flag come back in headers.
 */
export async function POST(req: Request) {
  const parsed = captureRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', 400);
  const { capture, turnstileToken } = parsed.data;
  const url = normalizeUrl(capture.url);
  if (!url) return apiError('INVALID_URL', 400);
  const host = new URL(url).hostname;
  if (isBlockedDomain(host)) return apiError('BLOCKED_SITE', 403);

  if (isMockCapture()) return mockCapture(host);

  if (!(await verifyTurnstile(turnstileToken, clientIp(req)))) return apiError('BOT_PROTECTION', 403);

  const counters = getCounters();
  const ipHash = ipHashOf(req);
  let release: (() => Promise<void>) | null = null;
  try {
    const limit = await checkRateLimit(counters, 'capture', ipHash, { perHour: LIMITS.capturesPerHour, perDay: LIMITS.capturesPerDay });
    if (!limit.ok) return apiError('RATE_LIMIT', 429, { minutes: limit.retryMinutes });
    release = await acquireSlot(counters, ipHash, LIMITS.concurrentJobsPerIp);
    if (!release) return apiError('RATE_LIMIT', 429, { minutes: 1 });
  } catch (err) {
    // A rate-limit store hiccup should not take capture down.
    console.warn('[capture] rate limit unavailable:', (err as Error).message);
  }

  try {
    const result = await capturePage({ ...capture, url }, { maxBytes: MAX_BYTES });
    return new Response(new Uint8Array(result.image), {
      headers: {
        'content-type': result.contentType,
        'cache-control': 'no-store',
        'x-weshot-title': encodeURIComponent(result.title),
        'x-weshot-truncated': result.truncated ? '1' : '0',
      },
    });
  } catch (err) {
    if (err instanceof CaptureError && err.code !== 'INTERNAL') {
      return apiError(err.code, err.code === 'RATE_LIMIT' ? 429 : 422, err.status !== undefined ? { status: err.status } : {});
    }
    console.error('[capture] failed', err);
    return apiError('CAPTURE_UNAVAILABLE', 503);
  } finally {
    await release?.().catch(() => undefined);
  }
}

/**
 * e2e (E2E_MOCK_CAPTURE=1): hosts pick the outcome, e.g. "timeout.test" → TIMEOUT, "bot.test" → BOT_CHECK,
 * "error500.test" → HTTP_5XX, "private.test" → BLOCKED_HOST, "ratelimit.test" → RATE_LIMIT, anything else succeeds.
 */
async function mockCapture(host: string): Promise<Response> {
  await new Promise((r) => setTimeout(r, 500));
  if (host === 'timeout.test') return apiError('TIMEOUT', 422);
  if (host === 'bot.test') return apiError('BOT_CHECK', 422);
  if (host === 'error500.test') return apiError('HTTP_5XX', 422, { status: 503 });
  if (host === 'private.test') return apiError('BLOCKED_HOST', 422);
  if (host === 'ratelimit.test') return apiError('RATE_LIMIT', 429, { minutes: 42 });
  if (host === 'offline.test') return apiError('CAPTURE_UNAVAILABLE', 503);
  const body = await readFile(join(process.cwd(), 'e2e/fixtures/capture.png'));
  return new Response(new Uint8Array(body), {
    headers: { 'content-type': 'image/png', 'x-weshot-title': encodeURIComponent('Mock page'), 'x-weshot-truncated': '0' },
  });
}
