'use client';

import { forwardRef, type ReactNode } from 'react';
import { cx } from '../ui/cx';

type Props = { id: string; title: string; active: boolean; children: ReactNode; aside?: ReactNode };

/** Glass tile, radius 22, padding 18 (UI spec §3.1). The active tab's tile gets a yellow border. */
export const ControlTile = forwardRef<HTMLElement, Props>(function ControlTile({ id, title, active, children, aside }, ref) {
  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`${id}-title`}
      className={cx(
        'glass-tile flex min-w-0 flex-col gap-3 rounded-[22px] p-[18px] transition-colors duration-150',
        active && '!border-ws-yellow-line',
      )}
    >
      <div className="flex min-h-[28px] items-center justify-between gap-2">
        <h3 id={`${id}-title`} className="text-[16px] font-semibold leading-[1.3]">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
});
