'use client';

import type { ShareResponse } from '@weshot/shared';

const KEY = 'weshot.shares.v1';

/** Delete tokens stay in this browser only (product spec §2.1). */
export function storedShares(): ShareResponse[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as ShareResponse[];
    return Array.isArray(list) ? list.filter((s) => new Date(s.expiresAt) > new Date()) : [];
  } catch {
    return [];
  }
}

export function rememberShare(s: ShareResponse): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...storedShares(), s].slice(-200)));
  } catch {
    /* storage full or blocked: the link still works, it just can't be deleted from here */
  }
}

export function findStoredShare(id: string): ShareResponse | null {
  return storedShares().find((s) => s.id === id) ?? null;
}

export async function deleteShare(id: string): Promise<boolean> {
  const s = findStoredShare(id);
  if (!s) return false;
  const res = await fetch(`/api/share/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'x-delete-token': s.deleteToken } });
  if (res.status !== 204) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(storedShares().filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
  return true;
}
