'use client';

import { Copy } from 'lucide-react';
import { deleteShare } from '@/lib/share-store';
import { useEditor } from '@/lib/store';
import { Dialog } from '../ui/Dialog';

/** UI spec §4 "Share created": URL in a read-only input, Copy link, "Expires in 30 days", Delete. */
export function ShareDialog() {
  const share = useEditor((s) => s.share);
  const setShare = useEditor((s) => s.setShare);
  const showToast = useEditor((s) => s.showToast);
  const close = () => setShare({ kind: 'closed' });
  return (
    <Dialog open={share.kind !== 'closed'} onClose={close} title="Share link">
      {share.kind === 'working' ? (
        <p role="status" className="flex items-center gap-3 py-3 text-[15px] text-ws-text-2">
          <span aria-hidden="true" className="ws-pulse h-2.5 w-2.5 rounded-full bg-ws-yellow" />
          Creating your link
        </p>
      ) : null}
      {share.kind === 'error' ? (
        <p role="alert" className="py-2 text-[15px] text-white">
          {share.message}
        </p>
      ) : null}
      {share.kind === 'ready' ? (
        <div className="flex flex-col gap-3">
          <label className="sr-only" htmlFor="ws-share-url">
            Share link
          </label>
          <input
            id="ws-share-url"
            readOnly
            value={share.url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 w-full rounded-[14px] border border-white/[0.14] bg-black/25 px-4 text-[15px] text-white"
          />
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(share.url);
                showToast('Link copied');
              } catch {
                (document.getElementById('ws-share-url') as HTMLInputElement | null)?.select();
              }
            }}
            className="btn-primary inline-flex h-[52px] items-center justify-center gap-2 rounded-[16px] text-[16px]"
          >
            <Copy size={18} strokeWidth={1.75} aria-hidden="true" />
            Copy link
          </button>
          <div className="flex items-center justify-between">
            <p className="text-[14px] text-ws-text-3">Expires in 30 days</p>
            <button
              type="button"
              onClick={async () => {
                if (await deleteShare(share.id)) {
                  close();
                  showToast('Share link deleted');
                }
              }}
              className="inline-flex min-h-[44px] items-center px-2 text-[14px] text-white underline decoration-white/40 underline-offset-4"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
