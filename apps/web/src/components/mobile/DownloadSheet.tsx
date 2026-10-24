'use client';

import { Copy } from 'lucide-react';
import { SIZE_PRESETS, type ExportScale, type ImageFormat } from '@weshot/shared';
import { copyImage, downloadCurrent } from '@/lib/actions';
import { useEditor } from '@/lib/store';
import { cx } from '../ui/cx';
import { Dialog } from '../ui/Dialog';
import { OptionButton } from '../ui/OptionButton';
import { SegmentedControl } from '../ui/SegmentedControl';

const IMAGE: Array<[ImageFormat, string]> = [
  ['png', 'PNG'],
  ['jpg', 'JPG'],
  ['webp', 'WebP'],
];
const SIZES = SIZE_PRESETS.filter((p) => ['x-post', 'linkedin', 'instagram', 'product-hunt'].includes(p.id));

/** Mobile download sheet, UI spec §3.5. */
export function DownloadSheet() {
  const open = useEditor((s) => s.downloadSheetOpen);
  const setOpen = useEditor((s) => s.setDownloadSheetOpen);
  const format = useEditor((s) => s.exportFormat);
  const setFormat = useEditor((s) => s.setExportFormat);
  const scale = useEditor((s) => s.exportScale);
  const setScale = useEditor((s) => s.setExportScale);
  const canvas = useEditor((s) => s.frame.canvas);
  const setFrame = useEditor((s) => s.setFrame);
  const label = IMAGE.find(([f]) => f === format)?.[1] ?? 'PNG';

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Download" variant="sheet">
      <div className="flex max-h-[min(560px,75vh)] flex-col gap-5 overflow-y-auto pb-1">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[14px] text-ws-text-3">Format</legend>
          <div className="grid grid-cols-3 gap-2">
            {IMAGE.map(([f, l]) => (
              <OptionButton key={f} selected={format === f} onClick={() => setFormat(f)}>
                {l}
              </OptionButton>
            ))}
          </div>
        </fieldset>
            <fieldset>
              <legend className="mb-2 text-[14px] text-ws-text-3">Size</legend>
              <div className="flex flex-col gap-2">
                {SIZES.map((p) => {
                  const selected = canvas === p.id;
                  return (
                    <label
                      key={p.id}
                      className={cx(
                        'flex h-[50px] cursor-pointer items-center gap-3 rounded-[16px] border px-4 text-[15px]',
                        selected ? 'border-ws-yellow-line bg-ws-yellow-soft' : 'border-white/[0.14] bg-black/25',
                      )}
                    >
                      <input
                        type="radio"
                        name="ws-size"
                        checked={selected}
                        onChange={() => setFrame({ canvas: p.id })}
                        className="h-[18px] w-[18px] accent-[#FFD60A]"
                      />
                      <span className="flex-1">{p.name}</span>
                      <span className="font-mono text-[13px] text-ws-text-2">
                        {p.width} × {p.height}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
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
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" onClick={() => void downloadCurrent()} className="btn-primary h-14 w-full rounded-[18px] text-[17px]">
          Download {label}
        </button>
        <button type="button" onClick={() => void copyImage()} className="btn-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px]">
          <Copy size={18} strokeWidth={1.75} aria-hidden="true" />
          Copy image
        </button>
      </div>
    </Dialog>
  );
}
