'use client';

import { cx } from '../ui/cx';

/** Status pill over the preview while a link is captured, UI spec §2.12. */
export function StatusPill({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'glass-pill-status absolute bottom-[22px] left-1/2 z-10 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-3 rounded-pill py-2 pl-4 pr-4 text-[14px] text-white',
        className,
      )}
    >
      <span aria-hidden="true" className="ws-pulse h-2.5 w-2.5 shrink-0 rounded-full bg-ws-yellow" />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}
