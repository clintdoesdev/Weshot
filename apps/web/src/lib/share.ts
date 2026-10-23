'use client';

import { LIMITS, MIME_TYPES, errorMessage, type ImageFormat, type ShareResponse, type UploadRequest } from '@weshot/shared';
import { renderCurrentImage } from './actions';
import { isApiError, type ApiError } from './capture';
import { rememberShare } from './share-store';
import { useEditor } from './store';
import { uploadFile } from './uploads';

/**
 * Share link (product spec §2.1): the one moment a file leaves the browser. Uploads the current export
 * (or the recorded video when a video format is selected), creates /s/{id} and keeps the delete token locally.
 */
export async function openShare(): Promise<void> {
  const s = useEditor.getState();
  s.setShare({ kind: 'working' });
  try {
    let blob: Blob;
    let kind: 'image' | 'video';
    let width: number;
    let height: number;
    let contentType: UploadRequest['contentType'];
    const f = s.exportFormat;
    if ((f === 'mp4' || f === 'webm' || f === 'gif') && s.video) {
      blob = await (await fetch(s.video.url)).blob();
      kind = 'video';
      width = s.video.width;
      height = s.video.height;
      contentType = MIME_TYPES[s.video.format] as UploadRequest['contentType'];
    } else {
      const format: ImageFormat = f === 'jpg' || f === 'webp' ? f : 'png';
      const out = await renderCurrentImage(format, s.exportScale);
      blob = out.blob;
      kind = 'image';
      width = out.width;
      height = out.height;
      contentType = MIME_TYPES[format] as UploadRequest['contentType'];
    }
    if (blob.size > LIMITS.maxShareBytes) {
      s.setShare({ kind: 'error', message: 'That file is over 50 MB. Try a smaller size.' });
      return;
    }
    const key = await uploadFile('share', blob, contentType);
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, kind, width, height }),
    });
    const json = (await res.json()) as ShareResponse | ApiError;
    if (isApiError(json)) {
      useEditor.getState().setShare({ kind: 'error', message: json.message });
      return;
    }
    rememberShare(json);
    useEditor.getState().setShare({ kind: 'ready', id: json.id, url: json.url });
  } catch (e) {
    useEditor.getState().setShare({ kind: 'error', message: (e as ApiError).message ?? errorMessage('INTERNAL') });
  }
}
