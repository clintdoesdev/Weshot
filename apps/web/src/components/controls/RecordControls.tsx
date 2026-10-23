'use client';

import { CircleDot } from 'lucide-react';
import { LIMITS } from '@weshot/shared';
import { useEditor } from '@/lib/store';
import { startRecording } from '@/lib/record';
import { LinkOnly } from '../ui/LinkOnly';
import { Slider } from '../ui/Slider';

/** Compact Record tile (UI spec §3.1). The full recording options live in RecordPanel. */
export function RecordControls() {
  const record = useEditor((s) => s.record);
  const setRecord = useEditor((s) => s.setRecord);
  const enabled = useEditor((s) => s.source.kind === 'url' && s.source.bitmap !== null);
  const recording = useEditor((s) => s.recording.kind === 'recording');
  const max = record.format === 'gif' ? LIMITS.maxGifSec : LIMITS.maxVideoSec;
  return (
    <LinkOnly enabled={enabled} className="flex flex-col gap-3">
      <p className="text-[14px] text-ws-text-2">Scroll the page top to bottom inside the frame.</p>
      <Slider label="Length" value={record.lengthSec} min={LIMITS.minVideoSec} max={max} format={(v) => `${v} s`} onChange={(lengthSec) => setRecord({ lengthSec })} />
      <button
        type="button"
        disabled={recording}
        onClick={() => void startRecording()}
        className="btn-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-4 text-[15px]"
      >
        <CircleDot size={18} strokeWidth={1.75} aria-hidden="true" />
        {recording ? 'Recording in progress' : 'Record scroll video'}
      </button>
    </LinkOnly>
  );
}
