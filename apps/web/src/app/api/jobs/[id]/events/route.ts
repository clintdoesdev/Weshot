import { createRedis, eventChannel, getRedis, isTerminal, readJobState } from '@weshot/server';
import type { JobEvent } from '@weshot/shared';
import { mockSubscribe } from '@/lib/server/mock-worker';
import { isMockWorker } from '@/lib/server/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Recordings can take a few minutes including encoding; EventSource reconnects and replays state if cut.
export const maxDuration = 300;

const ID_RE = /^[\w-]{8,64}$/;

/** GET /api/jobs/:id/events — Server-Sent Events: status, progress, result, error (product spec §4.5). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_RE.test(id)) return new Response('Not found', { status: 404 });
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (e: JobEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
        // The worker always ends with status done/failed after the result or error.
        if (e.type === 'status' && isTerminal(e)) close();
      };
      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.close();
      };
      const ping = setInterval(() => !closed && controller.enqueue(encoder.encode(': ping\n\n')), 15_000);
      req.signal.addEventListener('abort', close);

      if (isMockWorker()) {
        const sub = mockSubscribe(id, send);
        if (!sub) {
          send({ type: 'error', code: 'NOT_FOUND', message: 'This job no longer exists.' });
          return close();
        }
        cleanup = () => {
          clearInterval(ping);
          sub.unsubscribe();
        };
        sub.replay.forEach(send);
        return;
      }

      const sub = createRedis();
      cleanup = () => {
        clearInterval(ping);
        sub.disconnect();
      };
      sub.on('message', (_ch, msg) => send(JSON.parse(msg) as JobEvent));
      await sub.subscribe(eventChannel(id));
      // Replay what happened before we subscribed (late connect or reconnect).
      const state = await readJobState(getRedis(), id);
      if (state.length === 0) send({ type: 'status', status: 'queued' });
      state.forEach(send);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
