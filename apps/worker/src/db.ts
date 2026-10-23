import { getRedis, jobRecords } from '@weshot/server';

/** Job records are bookkeeping; a Redis hiccup must not fail a capture. */
export async function updateJob(id: string, data: { status: string; assetKey?: string; errorCode?: string; durationMs?: number }) {
  try {
    await jobRecords.update(getRedis(), id, data);
  } catch (err) {
    console.warn(`[jobs] could not update job ${id}:`, (err as Error).message);
  }
}
