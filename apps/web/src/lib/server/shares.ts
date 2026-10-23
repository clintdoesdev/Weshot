import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { LIMITS } from '@weshot/shared';
import { getRedis, shareRecords, type ShareRecord } from '@weshot/server';
import { isMockWorker } from './request';

export type { ShareRecord };

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** 10-character id (product spec §4.8), unbiased via rejection sampling. */
export function shareId(length = 10): string {
  let out = '';
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < 248 && out.length < length) out += ALPHABET[b % 62];
    }
  }
  return out;
}

export function newDeleteToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function shareExpiry(from = new Date()): Date {
  return new Date(from.getTime() + LIMITS.shareTtlDays * 86_400_000);
}

// The e2e suite runs without Redis (E2E_MOCK_WORKER=1); shares then live in memory.
const g = globalThis as unknown as { __weshotShares?: Map<string, ShareRecord> };
const memory = (g.__weshotShares ??= new Map());

export const shares = {
  async create(s: Omit<ShareRecord, 'createdAt'>): Promise<ShareRecord> {
    if (isMockWorker()) {
      const rec = { ...s, createdAt: new Date() };
      memory.set(s.id, rec);
      return rec;
    }
    return shareRecords.create(getRedis(), s);
  },
  async find(id: string): Promise<ShareRecord | null> {
    if (isMockWorker()) return memory.get(id) ?? null;
    return shareRecords.find(getRedis(), id);
  },
  async remove(id: string, assetKey: string): Promise<void> {
    if (isMockWorker()) {
      memory.delete(id);
      return;
    }
    await shareRecords.remove(getRedis(), id, assetKey);
  },
};
