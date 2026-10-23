import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = { png: 'image/png', mp4: 'video/mp4', webm: 'video/webm', gif: 'image/gif' };

/** Fixture assets for the mocked worker; only exists when E2E_MOCK_WORKER=1. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  if (process.env.E2E_MOCK_WORKER !== '1') return new Response('Not found', { status: 404 });
  const { file } = await params;
  const m = /^(capture|video)\.(png|mp4|webm|gif)$/.exec(file);
  if (!m) return new Response('Not found', { status: 404 });
  const name = m[1] === 'capture' ? 'capture.png' : `video.${m[2]}`;
  try {
    const body = await readFile(join(process.cwd(), 'e2e/fixtures', name));
    return new Response(new Uint8Array(body), { headers: { 'content-type': TYPES[m[2]!]! } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
