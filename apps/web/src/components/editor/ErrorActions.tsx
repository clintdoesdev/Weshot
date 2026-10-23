'use client';

import { ERROR_ACTIONS, isErrorCode } from '@weshot/shared/errors';
import { cx } from '../ui/cx';

/** Action buttons for an error (product spec §6). */
export function ErrorActions({ code, className }: { code: string; className?: string }) {
  if (!isErrorCode(code)) return null;
  const actions = ERROR_ACTIONS[code];
  if (actions.length === 0) return null;
  return (
    <span className={cx('inline-flex flex-wrap gap-2', className)}>
      {actions.map((a) =>
        a === 'retry' ? (
          <button key={a} type="button" className="btn-secondary h-11 rounded-pill px-4 text-[14px]" onClick={() => void import('@/lib/capture').then((m) => m.retryCapture())}>
            Retry
          </button>
        ) : a === 'paste-screenshot' ? (
          <button
            key={a}
            type="button"
            className="btn-secondary h-11 rounded-pill px-4 text-[14px]"
            onClick={() => document.getElementById('ws-image-input')?.click()}
          >
            Paste a screenshot instead
          </button>
        ) : null,
      )}
    </span>
  );
}
