'use client';

import { Copy, Download } from 'lucide-react';
import type { ExportScale, ImageFormat } from '@weshot/shared';
import { copyImage, downloadCurrent } from '@/lib/actions';
import { useEditor } from '@/lib/store';
import { Chip } from '../ui/Chip';
import { SegmentedControl } from '../ui/SegmentedControl';

const FORMATS: Array<{ value: ImageFormat; label: string }> = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
];

export function ExportControls({ showDownload = false }: { showDownload?: boolean }) {
  const format = useEditor((s) => s.exportFormat);
  const setFormat = useEditor((s) => s.setExportFormat);
  const scale = useEditor((s) => s.exportScale);
  const setScale = useEditor((s) => s.setExportScale);
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Format" className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <Chip key={f.value} selected={format === f.value} selectedStyle="solid" onClick={() => setFormat(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>
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
      <button
        type="button"
        onClick={() => void copyImage()}
        className="btn-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px]"
      >
        <Copy size={18} strokeWidth={1.75} aria-hidden="true" />
        Copy
      </button>
    </div>
  );
}
