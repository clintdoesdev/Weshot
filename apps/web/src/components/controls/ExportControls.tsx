'use client';

import { Copy, Download, Link2 } from 'lucide-react';
import type { ExportScale, ImageFormat, VideoFormat } from '@weshot/shared';
import { copyImage, downloadCurrent } from '@/lib/actions';
import { openShare } from '@/lib/share';
import { useEditor } from '@/lib/store';
import { Chip } from '../ui/Chip';
import { SegmentedControl } from '../ui/SegmentedControl';

const FORMATS: Array<{ value: ImageFormat | VideoFormat; label: string; video?: boolean }> = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
  { value: 'mp4', label: 'MP4', video: true },
  { value: 'gif', label: 'GIF', video: true },
];

export function isVideoFormat(f: string): f is VideoFormat {
  return f === 'mp4' || f === 'webm' || f === 'gif';
}

export function ExportControls({ showDownload = false }: { showDownload?: boolean }) {
  const format = useEditor((s) => s.exportFormat);
  const setFormat = useEditor((s) => s.setExportFormat);
  const scale = useEditor((s) => s.exportScale);
  const setScale = useEditor((s) => s.setExportScale);
  const setRecord = useEditor((s) => s.setRecord);
  const linkMode = useEditor((s) => s.source.kind === 'url');
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Format" className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <Chip
            key={f.value}
            selected={format === f.value}
            selectedStyle="solid"
            disabled={f.video && !linkMode}
            title={f.video && !linkMode ? 'Available for links' : undefined}
            onClick={() => {
              setFormat(f.value);
              if (isVideoFormat(f.value)) setRecord({ format: f.value });
            }}
          >
            {f.label}
          </Chip>
        ))}
      </div>
      {!isVideoFormat(format) ? (
        <SegmentedControl<ExportScale>
          label="Export scale"
          value={scale}
          onChange={setScale}
          options={[
            { value: 1, label: '1x' },
            { value: 2, label: '2x' },
            { value: 4, label: '4x' },
          ]}
          className="w-full"
        />
      ) : null}
      {showDownload ? (
        <button
          type="button"
          onClick={() => void downloadCurrent()}
          className="btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-[14px] text-[16px]"
        >
          <Download size={18} strokeWidth={1.75} aria-hidden="true" />
          Download
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void copyImage()}
          className="btn-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px]"
        >
          <Copy size={18} strokeWidth={1.75} aria-hidden="true" />
          Copy
        </button>
        <button
          type="button"
          onClick={() => void openShare()}
          className="btn-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px]"
        >
          <Link2 size={18} strokeWidth={1.75} aria-hidden="true" />
          Share link
        </button>
      </div>
    </div>
  );
}
