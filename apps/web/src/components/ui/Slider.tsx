'use client';

import { useId, type CSSProperties } from 'react';
import { cx } from './cx';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
};

/** Slider, UI spec §2.7: native range input, value right-aligned in Geist Mono. */
export function Slider({ label, value, min, max, step = 1, onChange, format, disabled, className, hideLabel }: Props) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  const text = format ? format(value) : String(value);
  return (
    <div className={cx('flex flex-col gap-1', disabled && 'opacity-40', className)}>
      <div className={cx('flex items-center justify-between', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="text-[14px] text-white/[0.85]">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[13px] text-ws-text-2">
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={text}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ws-range disabled:cursor-not-allowed"
        style={{ '--fill': `${fill}%` } as CSSProperties}
      />
    </div>
  );
}
