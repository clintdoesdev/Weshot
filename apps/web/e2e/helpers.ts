import type { Page } from '@playwright/test';

/** Dispatch a paste of a generated PNG at the document level, like Cmd+V with an image on the clipboard. */
export async function pasteImage(page: Page, width = 1200, height = 800, color = '#3355FF') {
  await page.evaluate(
    async ({ width, height, color }) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(40, 40, width / 3, height / 4);
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'shot.png', { type: 'image/png' }));
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    },
    { width, height, color },
  );
}

export async function dropImage(page: Page) {
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 500;
    c.getContext('2d')!.fillRect(0, 0, 800, 500);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'drop.png', { type: 'image/png' }));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
}

/** Emoji and pictographs, except the plain text symbols © ® ™. */
export const EMOJI = /(?![\u00A9\u00AE\u2122])\p{Extended_Pictographic}/u;
