'use client';

import { useEffect, useState } from 'react';
import { deleteShare, findStoredShare } from '@/lib/share-store';

/** "Delete" appears only in the browser that created the link (it holds the delete token). */
export function ShareOwnerActions({ id }: { id: string }) {
  const [owner, setOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOwner(findStoredShare(id) !== null), [id]);
  if (!owner) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        if (await deleteShare(id)) window.location.href = '/';
        else setBusy(false);
      }}
      className="inline-flex min-h-[44px] items-center text-white underline decoration-white/40 underline-offset-4 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
