'use client';

import { GALLERY_EXAMPLES } from '@weshot/shared/presets';
import Image from 'next/image';
import { editorActions } from '@/lib/lazy-actions';
import { useEditor } from '@/lib/store';

/** UI spec §3.1 item 4 / §3.3: each example is a preset; clicking loads it into the editor. */
export function Gallery() {
  const applyFrame = useEditor((s) => s.applyFrame);
  return (
    <section id="gallery" aria-labelledby="gallery-title" className="mx-auto max-w-container py-14 md:px-8 md:py-[88px]">
      <div className="px-4 text-center md:px-0">
        <h2 id="gallery-title" className="text-h2-m font-semibold md:text-h2">
          Start from a look you like
        </h2>
        <p className="mx-auto mt-4 max-w-[620px] text-[16px] text-ws-text-2 md:text-[18px]">
          Each example is a preset. Click one to load it into the editor with your own link.
        </p>
      </div>
      <ul className="no-scrollbar mt-8 flex snap-x gap-3 overflow-x-auto px-4 md:mt-12 md:grid md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] md:gap-4 md:overflow-visible md:px-0">
        {GALLERY_EXAMPLES.map((ex) => (
          <li key={ex.id} className="w-[240px] shrink-0 snap-start md:w-auto">
            <button
              type="button"
              onClick={() => {
                applyFrame(ex.frame);
                void editorActions().then((a) => a.revealEditor());
              }}
              className="glass-tile block w-full rounded-[24px] p-2.5 text-left"
            >
              <span className="relative block h-[160px] overflow-hidden rounded-[16px] md:h-[210px]">
                <Image
                  src={`/images/gallery-${ex.id}.webp`}
                  alt={`${ex.caption}, framed sample page`}
                  fill
                  sizes="(max-width: 767px) 220px, 300px"
                  className="object-cover"
                />
              </span>
              <span className="block px-1.5 pb-1 pt-3 text-[15px]">{ex.caption}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
