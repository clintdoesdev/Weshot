import type { ReactNode } from 'react';
import { cx } from '../ui/cx';

/** Label on the left, value or control on the right. */
export function Row({
  label,
  children,
  className,
  labelId,
  stack,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  labelId?: string;
  /** Label above a full-width control, for narrow tiles. */
  stack?: boolean;
}) {
  return (
    <div className={cx(stack ? 'flex flex-col gap-2' : 'flex min-h-[44px] items-center justify-between gap-3', className)}>
      <span id={labelId} className="text-[14px] text-white/[0.85]">
        {label}
      </span>
      {children}
    </div>
  );
}

export const menuTriggerClass =
  'inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2.5 text-[14px] text-ws-text-2 hover:bg-white/[0.06] disabled:cursor-not-allowed';
