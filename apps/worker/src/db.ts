import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();

/** Job rows are bookkeeping; a database hiccup must not fail a capture. */
export async function updateJob(id: string, data: { status: string; assetKey?: string; errorCode?: string; durationMs?: number }) {
  try {
    await db.job.update({ where: { id }, data });
  } catch (err) {
    console.warn(`[db] could not update job ${id}:`, (err as Error).message);
  }
}
