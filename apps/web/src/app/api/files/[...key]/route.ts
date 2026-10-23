import { LocalStorage, getStorage } from '@weshot/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Local development storage (DECISIONS.md): serves and accepts files when R2 is not configured.
 * In production files live on R2 behind the CDN and this route returns 404.
 */
function local(): LocalStorage | null {
  const s = getStorage();
  return s instanceof LocalStorage ? s : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const s = local();
  if (!s) return new Response('Not found', { status: 404 });
  const key = (await params).key.join('/');
  let file;
  try {
    file = await s.read(key);
  } catch {
    file = null;
  }
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: { 'content-type': file.contentType, 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const s = local();
  if (!s) return new Response('Not found', { status: 404 });
  const key = (await params).key.join('/');
  const q = new URL(req.url).searchParams;
  const ct = q.get('ct') ?? '';
  const max = Number(q.get('max'));
  const exp = Number(q.get('exp'));
  const sig = q.get('sig') ?? '';
  if (!s.verify(key, ct, max, exp, sig) || req.headers.get('content-type') !== ct) return new Response('Forbidden', { status: 403 });
  const body = new Uint8Array(await req.arrayBuffer());
  if (body.byteLength > max) return new Response('Too large', { status: 413 });
  try {
    await s.put(key, body, ct);
  } catch {
    return new Response('Bad key', { status: 400 });
  }
  return new Response(null, { status: 200 });
}
