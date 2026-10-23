'use client';

import { Link2, RefreshCw } from 'lucide-react';
import { VIEWPORT_PRESETS } from '@weshot/shared';
import { recapture } from '@/lib/capture';
import { sameCapture, useEditor } from '@/lib/store';
import { Logo } from '../ui/Logo';

/** URL row shown once a link is framed (UI spec §3.2): logo, URL with Re-capture, capture summary. */
export function EditorUrlRow() {
  const source = useEditor((s) => s.source);
  const capture = useEditor((s) => s.capture);
  const capturedWith = useEditor((s) => s.capturedWith);
  const capturing = useEditor((s) => s.phase.kind === 'capturing');
  if (source.kind !== 'url') return null;
  const changed = capturedWith !== null && !sameCapture(capture, capturedWith);
  const device =
    VIEWPORT_PRESETS.find((p) => p.width === capture.viewport.width && p.height === capture.viewport.height)?.name ?? 'Custom';
  return (
    <div className="flex flex-wrap items-center gap-3 px-1">
      <Logo className="hidden lg:inline-flex" />
      <div className="glass-bar flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-pill pl-5 pr-1.5">
        <Link2 size={20} strokeWidth={1.75} className="shrink-0 text-ws-text-2" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[15px]">{source.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
        {changed ? (
          <button
            type="button"
            onClick={() => void recapture()}
            disabled={capturing}
            className="btn-secondary inline-flex h-10 items-center gap-2 rounded-pill px-4 text-[14px]"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ws-yellow" />
            <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
            Re-capture
          </button>
        ) : null}
      </div>
      <span className="font-mono text-[13px] text-ws-text-2">
        {device}, {capture.viewport.width} × {capture.viewport.height}, {capture.scale}x
      </span>
    </div>
  );
}
