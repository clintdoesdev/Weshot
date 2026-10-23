import type { ReactNode } from 'react';
import { Footer } from '../landing/Footer';
import { Nav } from '../landing/Nav';

/** Shared layout for Terms and Privacy. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="relative overflow-x-clip">
      <Nav />
      <main className="mx-auto max-w-faq px-4 pb-20 pt-14 md:px-8 md:pt-20">
        <h1 className="text-h2-m font-semibold md:text-h2">{title}</h1>
        <p className="mt-3 text-[14px] text-ws-text-3">Last updated {updated}</p>
        <div className="legal mt-10 flex flex-col gap-4 text-[16px] leading-[1.6] text-ws-text-2 [&_a]:text-white [&_a]:underline [&_a]:decoration-white/40 [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:text-card-m [&_h2]:font-semibold [&_h2]:text-white md:[&_h2]:text-card [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
