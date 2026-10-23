'use client';

import { getBackground, displayUrl } from '@weshot/shared';
import { useEditor } from '@/lib/store';

/** Preview alt text, UI spec §8: "Framed screenshot of queuely.app on Honey background". */
export function usePreviewDescription(): string {
  const source = useEditor((s) => s.source);
  const bg = useEditor((s) => s.frame.background);
  const what =
    source.kind === 'url'
      ? `screenshot of ${displayUrl(source.url)}`
      : source.kind === 'image'
        ? 'pasted screenshot'
        : 'sample page queuely.app';
  const where =
    bg.kind === 'preset'
      ? `${getBackground(bg.id).name} background`
      : bg.kind === 'transparent'
        ? 'a transparent background'
        : bg.kind === 'image'
          ? 'an image background'
          : bg.kind === 'gradient'
            ? 'a gradient background'
            : 'a solid color background';
  return `Framed ${what} on ${where}`;
}
