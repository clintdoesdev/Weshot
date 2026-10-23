'use client';

import { Menu as MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Logo } from '../ui/Logo';

const LINKS = [
  { href: '#gallery', label: 'Examples' },
  { href: '#recordings', label: 'Recordings' },
  { href: '#faq', label: 'FAQ' },
];

/** UI spec §2.2. Nothing else: no sign-in, no CTA. */
export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 mx-4 mt-4 md:mx-auto md:mt-5 md:max-w-nav md:px-0">
      <nav aria-label="Main" className="glass-nav flex items-center justify-between rounded-pill py-2 pl-5 pr-2 md:py-2.5 md:pl-5 md:pr-2.5">
        <a href="/" aria-label="WeShot home" className="rounded-[10px]">
          <span className="hidden md:inline">
            <Logo />
          </span>
          <span className="md:hidden">
            <Logo size="sm" />
          </span>
        </a>
        <ul className="hidden items-center md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="block rounded-pill px-3.5 py-2.5 text-[15px] text-white/[0.78] transition-colors duration-150 hover:bg-ws-glass-btn">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label="Open menu"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="btn-secondary inline-flex h-11 w-11 items-center justify-center rounded-full md:hidden"
        >
          <MenuIcon size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </nav>
      <Dialog open={open} onClose={() => setOpen(false)} title="Menu" variant="sheet">
        <ul className="flex flex-col gap-1 pb-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[52px] items-center rounded-[16px] px-4 text-[17px] text-white hover:bg-white/[0.06]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </Dialog>
    </header>
  );
}
