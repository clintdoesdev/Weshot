import { drawDemoPage } from '@weshot/frame';

let demo: Promise<ImageBitmap> | null = null;

/** The sample page shown framed before the user pastes anything. Painted once, 1440 × 900. */
export function getDemoBitmap(): Promise<ImageBitmap> {
  if (!demo) {
    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 900;
    drawDemoPage(canvas.getContext('2d')!, 1440, 900);
    demo = createImageBitmap(canvas);
  }
  return demo;
}

export const DEMO_URL = 'https://queuely.app/';
