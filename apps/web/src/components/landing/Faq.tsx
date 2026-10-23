import { ChevronDown } from 'lucide-react';

const QUESTIONS = [
  {
    q: 'Can I frame a page behind a login?',
    a: 'Take the screenshot yourself and paste it into the bar. The frame and background work the same way.',
    mobileOrder: 'max-md:order-2',
  },
  {
    q: 'Why did my capture fail?',
    a: 'Some sites block automated browsers. WeShot says which check stopped it and suggests pasting a screenshot instead.',
    mobileOrder: 'max-md:hidden',
  },
  { q: 'Do I need an account?', a: 'No. Paste, style, download. Your presets are saved in your browser.', mobileOrder: 'max-md:order-1' },
  { q: 'Is it really free?', a: 'Yes. Captures, recordings and downloads are all free to use.', mobileOrder: 'max-md:order-3' },
];

/** UI spec §3.1 item 7 and the copy deck in §5. Mobile shows account, login pages and free (§3.3). */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-faq px-4 py-14 md:px-8 md:py-[88px]">
      <h2 id="faq-title" className="text-center text-h2-m font-semibold md:text-h2">
        Questions
      </h2>
      <div className="mt-8 flex flex-col gap-3 md:mt-12">
        {QUESTIONS.map((item) => (
          <details
            key={item.q}
            className={`group rounded-[20px] border border-ws-line-1 bg-ws-glass-1 px-6 py-5 ${item.mobileOrder}`}
          >
            <summary className="flex min-h-[24px] cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium marker:hidden [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ws-text-2 transition-transform duration-150 group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-[16px] text-ws-text-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
