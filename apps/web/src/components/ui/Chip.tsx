'use client';

import type { ReactNode } from 'react';
import { cx } from './cx';

type Props = {
  children: ReactNode;
  selected?: boolean;
  /** `solid` = yellow fill (selected format chip in Export); `soft` = yellow-soft (selected preset). */
  selectedStyle?: 'soft' | 'solid';
  dashed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
};

/** Chip, UI spec §2.9. */
export function Chip({ children, selected, selectedStyle = 'soft', dashed, onClick, disabled, title, className }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-[14px] text-[14px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        selected
          ? selectedStyle === 'solid'
            ? 'border-ws-yellow bg-ws-yellow font-semibold text-ws-on-yellow'
            : 'border-ws-yellow-line bg-ws-yellow-soft text-white'
          : cx('bg-white/[0.06] text-white/[0.85] hover:bg-white/[0.1]', dashed ? 'border-dashed border-white/30' : 'border-ws-line-2'),
        className,
      )}
    >
      {children}
    </button>
  );
}
