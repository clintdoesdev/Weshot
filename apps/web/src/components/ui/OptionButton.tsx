'use client';

import type { ReactNode } from 'react';
import { cx } from './cx';

type Props = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  size?: 'md' | 'lg';
};

/** Choice card, UI spec §2.5. */
export function OptionButton({ selected, onClick, children, description, disabled, className, size = 'md' }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'border text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        size === 'lg' ? 'rounded-[18px] px-4 py-[14px]' : 'flex h-12 items-center justify-center rounded-[12px] px-3 text-center text-[14px]',
        selected ? 'border-ws-yellow-line bg-ws-yellow-soft text-white' : 'border-white/[0.14] bg-black/25 text-white/75 hover:bg-white/[0.06]',
        className,
      )}
    >
      {size === 'lg' ? (
        <>
          <span className="block text-[15px] font-semibold text-white">{children}</span>
          {description ? <span className="mt-1 block text-[13px] text-ws-text-3">{description}</span> : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
