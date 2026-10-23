'use client';

import { useEditor } from '@/lib/store';

/** Mobile caption under the bar: "Free, no account. Or tap to pick a screenshot." (UI spec §3.3). */
export function PickScreenshotLink() {
  const hasError = useEditor((s) => s.phase.kind === 'error');
  if (hasError) return null;
  return (
    <p className="-mt-1 text-center text-[14px] text-ws-text-3">
      Free, no account. Or{' '}
      <button
        type="button"
        onClick={() => document.getElementById('ws-image-input')?.click()}
        className="inline-flex min-h-[44px] items-center text-white underline decoration-white/40 underline-offset-4"
      >
        tap to pick a screenshot
      </button>
      .
    </p>
  );
}
