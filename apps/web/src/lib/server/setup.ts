import { getRedis, isWorkerAlive } from '@weshot/server';

export type SetupStatus = {
  redis: boolean;
  turnstile: boolean;
  storage: 'r2' | 'local';
  worker: boolean;
};

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

/** What link capture needs, and whether each piece is there. No secrets are exposed. */
export async function setupStatus(): Promise<SetupStatus> {
  const prod = process.env.NODE_ENV === 'production';
  let redis = false;
  let worker = false;
  if (process.env.REDIS_URL || !prod) {
    try {
      const r = getRedis();
      redis = (await withTimeout(r.ping(), 3000, 'timeout')) === 'PONG';
      worker = redis && (await withTimeout(isWorkerAlive(r), 3000, false));
    } catch {
      redis = false;
    }
  }
  return {
    redis,
    turnstile: !!process.env.TURNSTILE_SECRET_KEY || !prod,
    storage: process.env.R2_ACCOUNT_ID ? 'r2' : 'local',
    worker,
  };
}

/**
 * Why link capture can't run right now, or null when it can. Checked before Turnstile and the queue,
 * so visitors get "Paste a screenshot instead" rather than a job that waits forever.
 */
export async function captureUnavailableReason(): Promise<string | null> {
  const s = await setupStatus();
  const prod = process.env.NODE_ENV === 'production';
  if (!s.redis) return 'redis';
  if (!s.turnstile) return 'turnstile';
  if (prod && s.storage !== 'r2') return 'storage';
  if (!s.worker) return 'worker';
  return null;
}
