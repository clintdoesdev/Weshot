import { randomUUID } from 'node:crypto';
import { checkRateLimit, dateKey, getRedis, getStorage } from '@weshot/server';
import { LIMITS, uploadRequestSchema } from '@weshot/shared';
import { NextResponse } from 'next/server';
import { TEMPLATE_MAX_BYTES } from '@/lib/server/limits';
import { apiError, ipHashOf, isMockWorker } from '@/lib/server/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'image/gif': 'gif',
};

/** POST /api/uploads — presigned PUT for a video frame template or a share file (product spec §4.5). */
export async function POST(req: Request) {
  const parsed = uploadRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', 400);
  const { kind, contentType } = parsed.data;
  if (kind === 'template' && contentType !== 'image/png') return apiError('BAD_REQUEST', 400);

  if (!isMockWorker()) {
    const limit = await checkRateLimit(getRedis(), 'upload', ipHashOf(req), { perHour: 60, perDay: 300 });
    if (!limit.ok) return apiError('RATE_LIMIT', 429, { minutes: limit.retryMinutes });
  }

  const prefix = kind === 'template' ? 'templates' : 'shares';
  const key = `${prefix}/${dateKey()}/${randomUUID()}.${EXT[contentType]}`;
  const max = kind === 'template' ? TEMPLATE_MAX_BYTES : LIMITS.maxShareBytes;
  const signed = await getStorage().presignPut(key, contentType, max);
  return NextResponse.json({ url: signed.url, key, headers: signed.headers });
}
