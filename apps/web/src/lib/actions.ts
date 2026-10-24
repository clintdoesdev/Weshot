'use client';

import { errorMessage, normalizeUrl, type ImageFormat } from '@weshot/shared';
import { getDemoBitmap } from './demo-source';
import { exportFilename, saveBlob } from './download';
import { renderExport } from './export';
import { ImageTooLargeError, decodeImageFile } from './image';
import { isMobileViewport, scrollToEditor } from './motion';
import { sourceTitle, sourceUrl, useEditor } from './store';
import { startCapture } from './capture';
import { track } from './analytics';

const get = () => useEditor.getState();

/** After Frame it (or a paste/drop): bring the editor into view. Mobile opens the full-screen editor. */
export function revealEditor(): void {
  if (isMobileViewport()) {
    if (!get().mobileEditorOpen) {
      get().setMobileEditorOpen(true);
      history.pushState({ weshotEditor: true }, '', '#editor');
    }
  } else {
    scrollToEditor();
  }
}

export async function loadImageFile(file: File): Promise<void> {
  const s = get();
  try {
    const bitmap = await decodeImageFile(file);
    s.setSource({ kind: 'image', bitmap, name: file.name || 'screenshot' });
    track('image_added');
    s.setPhase({ kind: 'idle' });
    s.setCapturedWith(null);
    revealEditor();
  } catch (err) {
    const code = err instanceof ImageTooLargeError ? 'IMAGE_TOO_LARGE' : 'NOT_AN_IMAGE';
    s.setPhase({
      kind: 'error',
      code,
      message: code === 'IMAGE_TOO_LARGE' ? errorMessage(code) : "That file isn't an image WeShot can read.",
    });
  }
}

/** Enter or Frame it in the paste bar. */
export function submitBar(value: string): void {
  const s = get();
  const url = normalizeUrl(value);
  if (!url) {
    s.setPhase({ kind: 'error', code: 'INVALID_URL', message: errorMessage('INVALID_URL') });
    return;
  }
  s.setBarValue(url.replace(/\/$/, ''));
  revealEditor();
  track('capture_started');
  void startCapture(url);
}

async function currentBitmap(): Promise<ImageBitmap | null> {
  const { source } = get();
  if (source.kind === 'demo') return source.bitmap ?? (await getDemoBitmap());
  return source.bitmap;
}

/** Render the current frame as it would be downloaded. */
export async function renderCurrentImage(format: ImageFormat, scale: number) {
  const s = get();
  const source = await currentBitmap();
  return renderExport({
    settings: s.frame,
    source,
    backgroundImage: s.frame.background.kind === 'image' ? s.backgroundImage : null,
    format,
    scale,
    resources: { url: sourceUrl(s.source), title: sourceTitle(s.source) },
  });
}

export async function downloadImage(format: ImageFormat = imageFormat(), scale: number = get().exportScale): Promise<void> {
  const s = get();
  try {
    const out = await renderCurrentImage(format, scale);
    track('download', { kind: 'image', format, scale: out.scale });
    saveBlob(out.blob, exportFilename(sourceUrl(s.source) ?? (s.source.kind === 'image' ? s.source.name.replace(/\.\w+$/, '') : null), out.width, out.height, format));
    if (out.scale < scale) s.showToast(`Exported at ${out.scale}x, the largest size this browser can make.`);
  } catch {
    s.showToast("Couldn't export the image. Try a smaller size.");
  }
}

function imageFormat(): ImageFormat {
  return get().exportFormat;
}

/** Copy image: always a PNG (the only type every clipboard accepts). */
export async function copyImage(): Promise<void> {
  const s = get();
  try {
    const blobPromise = renderCurrentImage('png', s.exportScale).then((r) => r.blob);
    // Safari needs the ClipboardItem created synchronously inside the gesture, with a promise.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
    s.showToast('Image copied');
    track('copy');
  } catch {
    s.showToast("Couldn't copy. Use Download instead.");
  }
}

/** Download button: the image in the selected format and scale. */
export async function downloadCurrent(): Promise<void> {
  await downloadImage();
}
