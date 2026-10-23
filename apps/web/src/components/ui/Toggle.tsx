'use client';

import { useId } from 'react';
import { cx } from './cx';

type Props = { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; className?: string };

/** Toggle, UI spec §2.6: a real checkbox with role=switch under the visual. */
export function Toggle({ label, checked, onChange, disabled, className }: Props) {
  const id = useId();
  return (
    <div className={cx('flex min-h-[44px] items-center justify-between gap-3', disabled && 'opacity-40', className)}>
      <label htmlFor={id} className="text-[14px] text-white/[0.85]">
        {label}
      </label>
      <span className="relative inline-flex h-6 w-10 shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-[-10px] z-10 h-[44px] w-[60px] cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute inset-0 rounded-pill transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-ws-yellow',
            checked ? 'bg-ws-yellow' : 'bg-ws-glass-on',
          )}
        />
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute top-[3px] h-[18px] w-[18px] rounded-full transition-[left,background-color] duration-150',
            checked ? 'left-[19px] bg-black' : 'left-[3px] bg-white',
          )}
        />
      </span>
    </div>
  );
}
