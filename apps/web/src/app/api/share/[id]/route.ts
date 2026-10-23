import { getStorage } from '@weshot/server';
import { shares, tokenMatches } from '@/lib/server/shares';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** DELETE /api/share/:id with header x-delete-token → 204 (product spec §4.5). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.headers.get('x-delete-token') ?? '';
  const share = /^[0-9A-Za-z]{10}$/.test(id) ? await shares.find(id) : null;
  // Same answer for a missing share and a wrong token, so ids cannot be probed.
  if (!share || !token || !tokenMatches(token, share.deleteHash)) return new Response(null, { status: 404 });
  await getStorage().delete(share.assetKey).catch(() => undefined);
  await shares.remove(id, share.assetKey);
  return new Response(null, { status: 204 });
}
