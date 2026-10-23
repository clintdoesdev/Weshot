import { LIMITS } from '@weshot/shared/constants';

export class ImageTooLargeError extends Error {
  constructor() {
    super('IMAGE_TOO_LARGE');
  }
}

export class NotAnImageError extends Error {
  constructor() {
    super('NOT_AN_IMAGE');
  }
}

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Scale an image so its longest side is at most `max`. Returns the original when it already fits. */
export async function fitBitmap(bitmap: ImageBitmap, max: number): Promise<ImageBitmap> {
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= max) return bitmap;
  const s = max / longest;
  const w = Math.round(bitmap.width * s);
  const h = Math.round(bitmap.height * s);
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return createImageBitmap(canvas);
}

/**
 * Decode a pasted, dropped or picked image. It stays in the browser (product spec §1.4).
 * Rejects files over 25 MB; images longer than 8,000 px are scaled down.
 */
export async function decodeImageFile(file: Blob): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/')) throw new NotAnImageError();
  if (file.size > LIMITS.maxImageBytes) throw new ImageTooLargeError();
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new NotAnImageError();
  }
  return fitBitmap(bitmap, LIMITS.maxImageSide);
}

/** Background uploads are stored as a JPEG data URL (max 2400 px) so presets can keep them. */
export async function backgroundDataUrl(file: Blob): Promise<string> {
  const bitmap = await fitBitmap(await decodeImageFile(file), 2400);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.9);
}

const bgCache = new Map<string, Promise<ImageBitmap>>();

/** Decode a background image `src` (data URL or same-origin URL) once and reuse it. */
export function loadBackgroundBitmap(src: string): Promise<ImageBitmap> {
  let p = bgCache.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) => r.blob())
      .then((b) => createImageBitmap(b));
    bgCache.set(src, p);
    p.catch(() => bgCache.delete(src));
  }
  return p;
}

/** First image file in a DataTransfer (paste or drop), if any. */
export function imageFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  for (const f of Array.from(dt.files ?? [])) if (f.type.startsWith('image/')) return f;
  return null;
}
