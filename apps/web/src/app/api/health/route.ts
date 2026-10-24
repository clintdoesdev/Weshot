import { NextResponse } from 'next/server';
import { isMockWorker } from '@/lib/server/request';
import { setupStatus } from '@/lib/server/setup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health: which parts of link capture are set up (see DEPLOY.md). Booleans only, no secrets.
 * Image mode works regardless; links, recordings and share links need all of these.
 */
export async function GET() {
  if (isMockWorker()) return NextResponse.json({ redis: true, turnstile: true, storage: 'local', worker: true, linkCapture: true });
  const s = await setupStatus();
  const prod = process.env.NODE_ENV === 'production';
  const linkCapture = s.redis && s.turnstile && s.worker && (!prod || s.storage === 'r2');
  return NextResponse.json({ ...s, linkCapture }, { headers: { 'cache-control': 'no-store' } });
}
