'use client';

import { ChevronDown } from 'lucide-react';
import { LIMITS } from '@weshot/shared';
import { startRecording } from '@/lib/record';
import { useEditor } from '@/lib/store';
import { LinkOnly } from '../ui/LinkOnly';
import { Menu } from '../ui/Menu';
import { OptionButton } from '../ui/OptionButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { Row, menuTriggerClass } from './Row';

const EASING = { easeInOut: 'Ease in and out', linear: 'Linear' } as const;

/** Full recording options, UI spec §3.2 right aside (and the Record tab on mobile). */
export function RecordPanel() {
  const record = useEditor((s) => s.record);
  const setRecord = useEditor((s) => s.setRecord);
  const recording = useEditor((s) => s.recording.kind === 'recording');
  const enabled = useEditor((s) => s.source.kind === 'url' && s.source.bitmap !== null);
  const gif = record.format === 'gif';
  const max = gif ? LIMITS.maxGifSec : LIMITS.maxVideoSec;

  return (
    <div className="flex flex-col gap-4">
      <LinkOnly enabled={enabled} className="flex flex-col gap-4">
        <div role="group" aria-label="Recording type" className="grid grid-cols-2 gap-2">
          <OptionButton size="lg" selected={record.type === 'scroll'} onClick={() => setRecord({ type: 'scroll' })} description="Scroll the page top to bottom inside the frame.">
            Scroll-through
          </OptionButton>
          <OptionButton size="lg" selected={record.type === 'tour'} onClick={() => setRecord({ type: 'tour' })} description="Glide between the parts you pick.">
            Section tour
          </OptionButton>
        </div>
        {record.type === 'tour' ? (
          <label className="flex flex-col gap-1.5 text-[14px] text-white/[0.85]">
            Sections
            <textarea
              rows={3}
              value={(record.sections ?? []).join('\n')}
              onChange={(e) =>
                setRecord({
                  sections: e.target.value
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .slice(0, 12),
                })
              }
              placeholder={'#features\n#pricing\nfooter'}
              className="rounded-[12px] border border-white/[0.14] bg-black/25 px-3 py-2 font-mono text-[13px] text-white"
            />
            <span className="text-[13px] text-ws-text-3">One CSS selector per line. Leave empty to visit the page&apos;s own sections.</span>
          </label>
        ) : null}
        <Slider label="Length" value={Math.min(record.lengthSec, max)} min={LIMITS.minVideoSec} max={max} format={(v) => `${v} s`} onChange={(lengthSec) => setRecord({ lengthSec })} />
        <Row label="Scroll easing">
          <Menu
            label={`Scroll easing, ${EASING[record.easing]}`}
            triggerClassName={menuTriggerClass}
            trigger={
              <>
                {EASING[record.easing]}
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
              </>
            }
            items={(Object.keys(EASING) as Array<keyof typeof EASING>).map((k) => ({
              id: k,
              label: EASING[k],
              checked: record.easing === k,
              onSelect: () => setRecord({ easing: k }),
            }))}
          />
        </Row>
        <Toggle label="Pause at headings" checked={record.pauseAtHeadings} onChange={(pauseAtHeadings) => setRecord({ pauseAtHeadings })} disabled={record.type === 'tour'} />
        <Toggle label="Animated cursor" checked={record.cursor} onChange={(cursor) => setRecord({ cursor })} />
        <Row label="Frame rate" stack>
          <SegmentedControl
            label="Frame rate"
            value={record.fps}
            onChange={(fps) => setRecord({ fps })}
            disabled={gif}
            options={[
              { value: 30, label: '30 fps' },
              { value: 60, label: '60 fps' },
            ]}
            className="w-full"
          />
        </Row>
        <Row label="Format" stack>
          <SegmentedControl
            label="Video format"
            value={record.format}
            onChange={(format) => {
              setRecord({ format, ...(format === 'gif' && record.lengthSec > LIMITS.maxGifSec ? { lengthSec: LIMITS.maxGifSec } : {}) });
              useEditor.getState().setExportFormat(format);
            }}
            options={[
              { value: 'mp4', label: 'MP4' },
              { value: 'webm', label: 'WebM' },
              { value: 'gif', label: 'GIF' },
            ]}
            className="w-full"
          />
        </Row>
      </LinkOnly>
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          disabled={recording || !enabled}
          onClick={() => void startRecording()}
          className="btn-primary h-14 w-full rounded-[18px] text-[17px]"
        >
          {recording ? 'Recording in progress' : 'Record scroll video'}
        </button>
        {recording ? <p className="text-center text-[14px] text-ws-text-3">You can keep styling while it records.</p> : null}
      </div>
    </div>
  );
}
