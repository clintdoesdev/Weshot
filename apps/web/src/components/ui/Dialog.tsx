'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from './cx';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  /** Bottom sheet on mobile (UI spec §3.5). */
  variant?: 'dialog' | 'sheet';
};

/** Native <dialog> for focus trapping and Escape; glass styling from the spec. */
export function Dialog({ open, onClose, title, children, className, variant = 'dialog' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        'm-0 max-h-none max-w-none bg-transparent p-0 text-white backdrop:bg-black/35',
        variant === 'sheet' ? 'fixed inset-x-0 bottom-0 top-auto w-full' : 'fixed inset-0 m-auto h-fit w-[min(92vw,460px)]',
      )}
    >
      {open ? (
        <div
          className={cx(
            variant === 'sheet'
              ? 'glass-sheet glass-sheet-strong ws-sheet-up rounded-t-[32px] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3'
              : 'glass-popover ws-fade-in rounded-[24px] p-6',
            className,
          )}
        >
          {variant === 'sheet' ? <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-10 rounded-pill bg-white/30" /> : null}
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="btn-secondary inline-flex h-11 w-11 items-center justify-center rounded-full">
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
