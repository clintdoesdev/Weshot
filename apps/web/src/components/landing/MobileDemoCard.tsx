'use client';

import Image from 'next/image';
import { editorActions } from '@/lib/lazy-actions';

/** Mobile landing demo preview (UI spec §3.3): radius 26, Honey stage 230 px with a framed window. */
export function MobileDemoCard() {
  return (
    <div className="mx-4 mt-8 md:hidden">
      <button type="button" onClick={() => void editorActions().then((a) => a.revealEditor())} className="glass-tile block w-full overflow-hidden rounded-[26px] p-2" aria-label="Open the editor">
        <span className="relative block h-[230px] overflow-hidden rounded-[20px]">
          <Image src="/images/demo-mobile.webp" alt="" fill sizes="100vw" priority className="object-cover" />
        </span>
      </button>
    </div>
  );
}
