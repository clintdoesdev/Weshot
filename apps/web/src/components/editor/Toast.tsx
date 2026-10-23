'use client';

import { useEffect } from 'react';
import { useEditor } from '@/lib/store';

/** Glass toast, bottom centre, 2 s (UI spec §4). Toasts with an action stay a little longer. */
export function Toast() {
  const toast = useEditor((s) => s.toast);
  const dismiss = useEditor((s) => s.dismissToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismiss(toast.id), toast.action ? 8000 : 2000);
    return () => clearTimeout(t);
  }, [toast, dismiss]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      {toast ? (
        <div key={toast.id} className="glass-pill-status ws-fade-in pointer-events-auto flex items-center gap-3 rounded-pill py-2 pl-5 pr-2 text-[15px]">
          <span className="py-1.5">{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                dismiss(toast.id);
              }}
              className="btn-primary h-10 rounded-pill px-4 text-[14px]"
            >
              {toast.action.label}
            </button>
          ) : (
            <span className="w-3" />
          )}
        </div>
      ) : null}
    </div>
  );
}
