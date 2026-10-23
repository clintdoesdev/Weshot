'use client';

import { Check } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';

export type MenuItem =
  | { kind?: 'item'; id: string; label: ReactNode; onSelect: () => void; checked?: boolean; disabled?: boolean; hint?: ReactNode }
  | { kind: 'separator'; id: string };

type Props = {
  /** Accessible name of the trigger. */
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
  triggerClassName?: string;
  align?: 'start' | 'end';
  disabled?: boolean;
  menuClassName?: string;
};

/** Accessible menu button: Enter/Space/ArrowDown open, arrows move, Escape closes and returns focus. */
export function Menu({ label, trigger, items, triggerClassName, align = 'end', disabled, menuClassName }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = list.current?.querySelector<HTMLElement>('[role^="menuitem"][aria-checked="true"]:not([disabled])') ??
      list.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([disabled])');
    first?.focus();
    const onDoc = (e: PointerEvent) => {
      if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const focusAt = (delta: number) => {
    const els = Array.from(list.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    els[(i + delta + els.length) % els.length]?.focus();
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={list}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Tab') {
              if (e.key === 'Escape') e.preventDefault();
              setOpen(false);
              if (e.key === 'Escape') btn.current?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              focusAt(1);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              focusAt(-1);
            }
          }}
          className={cx(
            'glass-popover absolute top-full z-40 mt-2 max-h-[min(420px,70vh)] min-w-[220px] overflow-auto rounded-[16px] p-1.5',
            align === 'end' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {items.map((item) =>
            item.kind === 'separator' ? (
              <div key={item.id} role="separator" className="my-1 h-px bg-white/10" />
            ) : (
              <button
                key={item.id}
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.checked}
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                  btn.current?.focus();
                }}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] text-white/90 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] disabled:opacity-40"
              >
                <span className="flex w-4 shrink-0 justify-center" aria-hidden="true">
                  {item.checked ? <Check size={16} strokeWidth={1.75} className="text-ws-yellow" /> : null}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.hint ? <span className="font-mono text-[13px] text-ws-text-3">{item.hint}</span> : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
