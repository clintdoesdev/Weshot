/** Save a blob through a temporary link. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function exportFilename(base: string | null, width: number, height: number, ext: string): string {
  const slug = (base ?? 'screenshot')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .toLowerCase();
  return `weshot-${slug || 'screenshot'}-${width}x${height}.${ext}`;
}
