import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { LIMITS } from '@weshot/shared';

/**
 * Job and share records in Redis (replaces the Postgres tables from product spec §4.8; see DECISIONS.md).
 * Same fields; expiry is handled by Redis TTLs instead of a cleanup query.
 */

export type JobKind = 'CAPTURE' | 'RECORD';
export type JobRecord = {
  id: string;
  kind: JobKind;
  status: string;
  url: string;
  /** sha256(ip + daily salt), never the raw IP */
  ipHash: string;
  assetKey?: string;
  errorCode?: string;
  durationMs?: number;
  createdAt: string;
};

export type ShareRecord = {
  /** 10-char id */
  id: string;
  assetKey: string;
  kind: 'image' | 'video';
  width: number;
  height: number;
  /** sha256(deleteToken) */
  deleteHash: string;
  expiresAt: Date;
  createdAt: Date;
};

const jobKey = (id: string) => `weshot:jobrec:${id}`;
const shareKey = (id: string) => `weshot:share:${id}`;
/** Sorted set of share files by expiry time, so the daily cron can delete files promptly. */
const SHARE_EXPIRY = 'weshot:shares:expiry';
const JOB_TTL = LIMITS.jobRetentionDays * 86_400;

export const jobRecords = {
  async create(redis: Redis, data: Omit<JobRecord, 'id' | 'createdAt'>): Promise<JobRecord> {
    const rec: JobRecord = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    const fields = Object.fromEntries(Object.entries(rec).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    await redis.multi().hset(jobKey(rec.id), fields).expire(jobKey(rec.id), JOB_TTL).exec();
    return rec;
  },
  async update(redis: Redis, id: string, patch: Partial<Pick<JobRecord, 'status' | 'assetKey' | 'errorCode' | 'durationMs'>>): Promise<void> {
    const fields = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    if (Object.keys(fields).length === 0) return;
    // Only update records that still exist (never resurrect an expired one without its TTL).
    if (await redis.exists(jobKey(id))) await redis.hset(jobKey(id), fields);
  },
  async get(redis: Redis, id: string): Promise<JobRecord | null> {
    const h = await redis.hgetall(jobKey(id));
    if (!h.id) return null;
    return {
      ...(h as unknown as JobRecord),
      ...(h.durationMs ? { durationMs: Number(h.durationMs) } : {}),
    };
  },
};

export const shareRecords = {
  async create(redis: Redis, s: Omit<ShareRecord, 'createdAt'>): Promise<ShareRecord> {
    const rec: ShareRecord = { ...s, createdAt: new Date() };
    const at = Math.floor(rec.expiresAt.getTime() / 1000);
    await redis
      .multi()
      .hset(shareKey(rec.id), {
        id: rec.id,
        assetKey: rec.assetKey,
        kind: rec.kind,
        width: String(rec.width),
        height: String(rec.height),
        deleteHash: rec.deleteHash,
        expiresAt: rec.expiresAt.toISOString(),
        createdAt: rec.createdAt.toISOString(),
      })
      .expireat(shareKey(rec.id), at)
      .zadd(SHARE_EXPIRY, rec.expiresAt.getTime(), `${rec.id}|${rec.assetKey}`)
      .exec();
    return rec;
  },
  async find(redis: Redis, id: string): Promise<ShareRecord | null> {
    const h = await redis.hgetall(shareKey(id));
    if (!h.id) return null;
    const rec: ShareRecord = {
      id: h.id,
      assetKey: h.assetKey!,
      kind: h.kind === 'video' ? 'video' : 'image',
      width: Number(h.width),
      height: Number(h.height),
      deleteHash: h.deleteHash!,
      expiresAt: new Date(h.expiresAt!),
      createdAt: new Date(h.createdAt!),
    };
    return rec.expiresAt > new Date() ? rec : null;
  },
  async remove(redis: Redis, id: string, assetKey: string): Promise<void> {
    await redis.multi().del(shareKey(id)).zrem(SHARE_EXPIRY, `${id}|${assetKey}`).exec();
  },
  /** Expired shares whose files still need deleting: [{ id, assetKey }]. */
  async expired(redis: Redis, now = Date.now(), limit = 500): Promise<Array<{ id: string; assetKey: string }>> {
    const members = await redis.zrangebyscore(SHARE_EXPIRY, 0, now, 'LIMIT', 0, limit);
    return members.map((m) => {
      const [id, assetKey] = m.split('|') as [string, string];
      return { id, assetKey };
    });
  },
};
