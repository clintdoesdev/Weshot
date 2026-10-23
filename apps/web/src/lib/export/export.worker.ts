/// <reference lib="webworker" />
import { runRenderJob } from './render-job';
import type { RenderRequest, RenderResponse } from './types';

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (event: MessageEvent<RenderRequest>) => {
  const req = event.data;
  let res: RenderResponse;
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const out = await runRenderJob(req, canvas);
    res = { id: req.id, ok: true, ...out };
  } catch (err) {
    res = { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    req.source?.close();
    req.backgroundImage?.close();
  }
  scope.postMessage(res);
};
