'use client';

import { cx } from '../ui/cx';

type Props = {
  tone: 'recording' | 'capturing';
  label: string;
  progress?: number | null;
  time?: string;
  onStop?: () => void;
  className?: string;
};

/** Status pill over the preview, UI spec §2.12. */
export function StatusPill({ tone, label, progress, time, onStop, className }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'glass-pill-status absolute bottom-[22px] left-1/2 z-10 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-3 rounded-pill py-2 pl-4 text-[14px] text-white',
        onStop ? 'pr-2' : 'pr-4',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx('h-2.5 w-2.5 shrink-0 rounded-full', tone === 'recording' ? 'bg-ws-rec' : 'ws-pulse bg-ws-yellow')}
      />
      <span className="whitespace-nowrap">{label}</span>
      {progress !== undefined && progress !== null ? (
        <span aria-hidden="true" className="hidden h-1 w-[180px] overflow-hidden rounded-pill bg-white/[0.18] sm:block">
          <span className="block h-full rounded-pill bg-ws-yellow transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
      ) : null}
      {time ? <span className="whitespace-nowrap font-mono text-[13px] text-ws-text-2">{time}</span> : null}
      {onStop ? (
        <button type="button" onClick={onStop} className="btn-secondary h-[34px] rounded-pill px-4 text-[14px]">
          Stop
        </button>
      ) : null}
    </div>
  );
}
