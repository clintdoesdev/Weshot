'use client';

import type { UploadRequest, UploadResponse } from '@weshot/shared';
import { isApiError, type ApiError } from './capture';

/** Ask for a presigned URL, then PUT the file straight to storage (R2 in production). */
export async function uploadFile(kind: UploadRequest['kind'], blob: Blob, contentType: UploadRequest['contentType']): Promise<string> {
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, contentType }),
  });
  const json = (await res.json()) as UploadResponse | ApiError;
  if (isApiError(json)) throw json;
  const put = await fetch(json.url, { method: 'PUT', headers: json.headers, body: blob });
  if (!put.ok) throw { code: 'INTERNAL', message: "Couldn't upload the file. Try again." };
  return json.key;
}
