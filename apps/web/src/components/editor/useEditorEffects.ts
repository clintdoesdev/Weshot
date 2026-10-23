'use client';

import { useEffect } from 'react';
import { loadBackgroundBitmap } from '@/lib/image';
import { useEditor } from '@/lib/store';

/** Decodes the uploaded background image whenever the background setting points at one. */
export function useBackgroundImage(): void {
  const bg = useEditor((s) => s.frame.background);
  const setBackgroundImage = useEditor((s) => s.setBackgroundImage);
  const src = bg.kind === 'image' ? bg.src : null;
  useEffect(() => {
    if (!src) return;
    let alive = true;
    loadBackgroundBitmap(src)
      .then((b) => alive && setBackgroundImage(b))
      .catch(() => alive && setBackgroundImage(null));
    return () => {
      alive = false;
    };
  }, [src, setBackgroundImage]);
}
