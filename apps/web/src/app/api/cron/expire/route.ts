import { getRedis, getStorage, shareRecords } from '@weshot/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily cleanup (product spec §4.8): deletes the files of expired share links. Share and job records
 * expire on their own through Redis TTLs (30 days). Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const redis = getRedis();
  const storage = getStorage();
  let deletedShares = 0;
  for (;;) {
    const batch = await shareRecords.expired(redis, Date.now(), 200);
    if (batch.length === 0) break;
    await Promise.all(batch.map((s) => storage.delete(s.assetKey).catch(() => undefined)));
    await Promise.all(batch.map((s) => shareRecords.remove(redis, s.id, s.assetKey)));
    deletedShares += batch.length;
  }
  return NextResponse.json({ deletedShares });
}
