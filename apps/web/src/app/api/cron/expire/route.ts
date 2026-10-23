import { getStorage } from '@weshot/server';
import { LIMITS } from '@weshot/shared';
import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily cleanup (product spec §4.8): expired shares and their files, and Job rows older than 30 days.
 * Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const now = new Date();
  const storage = getStorage();
  let deletedShares = 0;
  for (;;) {
    const batch = await db.share.findMany({ where: { expiresAt: { lt: now } }, take: 200, select: { id: true, assetKey: true } });
    if (batch.length === 0) break;
    await Promise.all(batch.map((s) => storage.delete(s.assetKey).catch(() => undefined)));
    await db.share.deleteMany({ where: { id: { in: batch.map((s) => s.id) } } });
    deletedShares += batch.length;
  }
  const jobs = await db.job.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - LIMITS.jobRetentionDays * 86_400_000) } } });
  return NextResponse.json({ deletedShares, deletedJobs: jobs.count });
}
