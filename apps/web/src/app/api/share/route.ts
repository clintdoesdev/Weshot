import { checkRateLimit, getRedis, getStorage } from '@weshot/server';
import { LIMITS, shareRequestSchema } from '@weshot/shared';
import { NextResponse } from 'next/server';
import { apiError, ipHashOf, isMockWorker } from '@/lib/server/request';
import { hashToken, newDeleteToken, shareExpiry, shareId, shares } from '@/lib/server/shares';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/share — turn an uploaded file into a 30-day share link (product spec §2.1, §4.5). */
export async function POST(req: Request) {
  const parsed = shareRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', 400);
  const { key, kind, width, height } = parsed.data;
  // Images are PNG/JPG/WebP exports; videos are MP4, WebM or GIF recordings.
  const ext = /\.(\w+)$/.exec(key)?.[1] ?? '';
  if (!(kind === 'image' ? ['png', 'jpg', 'webp'] : ['mp4', 'webm', 'gif']).includes(ext)) return apiError('BAD_REQUEST', 400);

  if (!isMockWorker()) {
    const limit = await checkRateLimit(getRedis(), 'share', ipHashOf(req), { perHour: 20, perDay: 100 });
    if (!limit.ok) return apiError('RATE_LIMIT', 429, { minutes: limit.retryMinutes });
  }

  const storage = getStorage();
  const size = await storage.size(key);
  if (size === null) return apiError('BAD_REQUEST', 400);
  if (size > LIMITS.maxShareBytes) {
    await storage.delete(key);
    return apiError('BAD_REQUEST', 413);
  }

  const id = shareId();
  const deleteToken = newDeleteToken();
  const expiresAt = shareExpiry();
  await shares.create({ id, assetKey: key, kind, width, height, deleteHash: hashToken(deleteToken), expiresAt });
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return NextResponse.json({ id, url: `${site.replace(/\/$/, '')}/s/${id}`, deleteToken, expiresAt: expiresAt.toISOString() });
}
