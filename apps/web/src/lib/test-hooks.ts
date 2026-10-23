'use client';

import { renderFrame, resolveCanvasSize } from '@weshot/frame';
import type { ImageFormat } from '@weshot/shared';
import { renderExport } from './export';
import { getDemoBitmap } from './demo-source';
import { sourceTitle, sourceUrl, useEditor } from './store';

/**
 * Hooks for the e2e suite only (NEXT_PUBLIC_E2E=1). Lets tests compare the export worker's output
 * with a main-thread render of the same settings.
 */
export function installTestHooks(): void {
  if (process.env.NEXT_PUBLIC_E2E !== '1') return;
  const w = window as unknown as Record<string, unknown>;
  w.__weshot = {
    store: useEditor,
    async compareExportWithMainThread(scale: number, format: ImageFormat = 'png') {
      const s = useEditor.getState();
      const source = s.source.bitmap ?? (await getDemoBitmap());
      const resources = { url: sourceUrl(s.source), title: sourceTitle(s.source) };
      const exp = await renderExport({ settings: s.frame, source, backgroundImage: s.backgroundImage, format, scale, resources });
      const size = resolveCanvasSize(s.frame, { width: source.width, height: source.height });
      const main = document.createElement('canvas');
      main.width = Math.round(size.width * scale);
      main.height = Math.round(size.height * scale);
      const ctx = main.getContext('2d', { willReadFrequently: true })!;
      renderFrame(ctx, source, s.frame, { ...size, scale }, { ...resources, backgroundImage: s.backgroundImage });
      const a = ctx.getImageData(0, 0, main.width, main.height).data;
      const bmp = await createImageBitmap(exp.blob);
      const other = document.createElement('canvas');
      other.width = bmp.width;
      other.height = bmp.height;
      const octx = other.getContext('2d', { willReadFrequently: true })!;
      octx.drawImage(bmp, 0, 0);
      const b = octx.getImageData(0, 0, bmp.width, bmp.height).data;
      let diff = 0;
      let maxDelta = 0;
      const box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
      for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i]! - b[i]!);
        if (d > 0) {
          diff++;
          const p = i >> 2;
          const x = p % main.width;
          const y = Math.floor(p / main.width);
          box.x0 = Math.min(box.x0, x);
          box.y0 = Math.min(box.y0, y);
          box.x1 = Math.max(box.x1, x);
          box.y1 = Math.max(box.y1, y);
        }
        if (d > maxDelta) maxDelta = d;
      }
      return { width: exp.width, height: exp.height, mainWidth: main.width, mainHeight: main.height, diff, maxDelta, total: a.length, box: diff > 0 ? box : null };
    },
  };
}
