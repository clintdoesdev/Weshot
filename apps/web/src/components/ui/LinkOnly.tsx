'use client';

import { useId, type ReactNode } from 'react';
import { cx } from './cx';

/**
 * Wraps controls that only work for links (UI spec §4, image mode): 40 % opacity,
 * tooltip "Available for links", and a disabled fieldset so nothing inside is focusable.
 */
export function LinkOnly({ enabled, children, className }: { enabled: boolean; children: ReactNode; className?: string }) {
  const id = useId();
  if (enabled) return <div className={className}>{children}</div>;
  return (
    <div className={cx('group relative', className)}>
      <fieldset disabled aria-describedby={id} className="m-0 min-w-0 border-0 p-0 opacity-40">
        {children}
      </fieldset>
      <span
        id={id}
        role="tooltip"
        className="glass-popover pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        Available for links
      </span>
    </div>
  );
}
