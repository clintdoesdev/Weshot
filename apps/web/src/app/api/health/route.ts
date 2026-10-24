import { NextResponse } from 'next/server';
import { usingRedis } from '@/lib/server/ratelimit';
import { turnstileEnabled } from '@/lib/server/turnstile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/health — capture runs inside this app; Redis (shared rate limits) and Turnstile are optional. */
export async function GET() {
  return NextResponse.json(
    { capture: 'built-in', rateLimits: usingRedis() ? 'redis' : 'memory', turnstile: turnstileEnabled() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
