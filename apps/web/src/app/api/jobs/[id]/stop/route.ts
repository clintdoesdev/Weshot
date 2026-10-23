import { getRedis, stopKey } from '@weshot/server';
import { isMockWorker } from '@/lib/server/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/jobs/:id/stop — the Stop button on the recording pill; the worker encodes what it has so far. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{8,64}$/.test(id)) return new Response(null, { status: 404 });
  if (!isMockWorker()) await getRedis().set(stopKey(id), '1', 'EX', 600);
  return new Response(null, { status: 204 });
}
