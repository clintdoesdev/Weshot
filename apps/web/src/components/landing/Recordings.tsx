import { Check, Play } from 'lucide-react';
import Image from 'next/image';
import { Glow } from '../ui/Glow';

const ITEMS = ['5 to 60 seconds, 30 or 60 fps', 'Animated cursor with click ripples', 'Section tour: glide between the parts you pick'];

/** UI spec §3.1 item 6. */
export function Recordings() {
  return (
    <section id="recordings" aria-labelledby="recordings-title" className="relative mx-auto max-w-container px-4 py-14 md:px-8 md:py-[88px]">
      <Glow className="hidden md:block" style={{ width: 700, height: 700, left: -220, top: -60, opacity: 0.28 }} />
      <div className="relative grid items-center gap-8 md:grid-cols-2 md:gap-14">
        <div>
          <h2 id="recordings-title" className="text-h2-m font-semibold md:text-h2">
            Scroll videos without screen recording
          </h2>
          <p className="mt-4 text-[16px] text-ws-text-2 md:text-[18px]">
            Paste a link and WeShot scrolls the page for you, inside the same frame, then hands you an MP4, WebM or GIF.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {ITEMS.map((t) => (
              <li key={t} className="flex items-center gap-3 text-[16px]">
                <Check size={20} strokeWidth={1.75} className="shrink-0 text-ws-yellow" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[28px] p-6 md:p-11" style={{ background: 'linear-gradient(160deg, #FFE45C 0%, #FFB800 100%)' }}>
          <div className="relative">
            <Image
              src="/images/recording-window.webp"
              alt="Framed sample page during a scroll recording"
              width={1100}
              height={760}
              sizes="(max-width: 767px) 90vw, 520px"
              className="h-auto w-full"
            />
            <span aria-hidden="true" className="absolute bottom-[10%] left-[8%] right-[8%] h-1 rounded-pill bg-black/15">
              <span className="block h-full w-[42%] rounded-pill bg-black" />
            </span>
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 backdrop-blur-xl"
            >
              <Play size={28} strokeWidth={1.75} className="ml-1 fill-ws-yellow text-ws-yellow" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
