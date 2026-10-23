'use client';

import type { ReactNode } from 'react';
import { useRef, type KeyboardEvent } from 'react';
import { cx } from './cx';

export type SegmentOption<T extends string | number> = {
  value: T;
  label: ReactNode;
  /** Required when the label is an icon. */
  ariaLabel?: string;
  disabled?: boolean;
  id?: string;
  controls?: string;
};

type Props<T extends string | number> = {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Primary = yellow selection (editor tabs, Image/Video); secondary = glass selection (value pickers). */
  variant?: 'primary' | 'secondary';
  /** `tabs` renders role=tablist/tab; `pressed` renders aria-pressed buttons (UI spec §2.4). */
  mode?: 'tabs' | 'pressed';
  label: string;
  shape?: 'pill' | 'tile';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  wrap?: boolean;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  variant = 'secondary',
  mode = 'pressed',
  label,
  shape = 'tile',
  size = 'md',
  className,
  buttonClassName,
  disabled,
  wrap,
}: Props<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const isTabs = mode === 'tabs';

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!isTabs) return;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    let next = index;
    if (e.key === 'Home') next = enabled[0]!;
    else if (e.key === 'End') next = enabled[enabled.length - 1]!;
    else {
      const pos = enabled.indexOf(index);
      next = enabled[(pos + dir + enabled.length) % enabled.length]!;
    }
    refs.current[next]?.focus();
    onChange(options[next]!.value);
  };

  const heights = { sm: 'min-h-[36px]', md: 'min-h-[40px]', lg: 'min-h-[44px]' };

  return (
    <div
      role={isTabs ? 'tablist' : 'group'}
      aria-label={label}
      className={cx(
        'inline-flex gap-[2px] border border-white/10 bg-ws-well p-[3px]',
        shape === 'pill' ? 'rounded-pill' : 'rounded-[12px]',
        wrap ? 'flex-wrap' : '',
        className,
      )}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            id={o.id}
            role={isTabs ? 'tab' : undefined}
            aria-selected={isTabs ? selected : undefined}
            aria-controls={isTabs ? o.controls : undefined}
            aria-pressed={isTabs ? undefined : selected}
            aria-label={o.ariaLabel}
            tabIndex={isTabs ? (selected ? 0 : -1) : undefined}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-3 text-[14px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
              heights[size],
              shape === 'pill' ? 'rounded-pill' : 'rounded-[9px]',
              selected
                ? variant === 'primary'
                  ? 'bg-ws-yellow font-semibold text-ws-on-yellow shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
                  : 'bg-ws-glass-on text-white'
                : variant === 'primary'
                  ? 'text-white/[0.78] hover:bg-white/[0.06]'
                  : 'text-white/70 hover:bg-white/[0.06]',
              buttonClassName,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
