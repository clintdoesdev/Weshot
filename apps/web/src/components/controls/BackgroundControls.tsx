'use client';

import { Ellipsis } from 'lucide-react';
import { useRef } from 'react';
import { backgroundDataUrl } from '@/lib/image';
import { useEditor } from '@/lib/store';
import { Menu } from '../ui/Menu';
import { Slider } from '../ui/Slider';
import { BackgroundSwatches } from './BackgroundSwatches';

export function BackgroundMoreMenu() {
  const bg = useEditor((s) => s.frame.background);
  const setBackground = useEditor((s) => s.setBackground);
  const showToast = useEditor((s) => s.showToast);
  const file = useRef<HTMLInputElement>(null);
  return (
    <>
      <Menu
        label="More backgrounds"
        triggerClassName="btn-secondary inline-flex h-11 w-11 items-center justify-center rounded-full"
        trigger={<Ellipsis size={18} strokeWidth={1.75} aria-hidden="true" />}
        items={[
          {
            id: 'solid',
            label: 'Custom color',
            checked: bg.kind === 'solid',
            onSelect: () => setBackground({ kind: 'solid', color: bg.kind === 'solid' ? bg.color : '#FFD60A' }),
          },
          {
            id: 'gradient',
            label: 'Gradient',
            checked: bg.kind === 'gradient',
            onSelect: () => setBackground(bg.kind === 'gradient' ? bg : { kind: 'gradient', from: '#FFE45C', to: '#0A0A0A', angle: 160 }),
          },
          { id: 'image', label: 'Upload image', checked: bg.kind === 'image', onSelect: () => file.current?.click() },
          { id: 'transparent', label: 'Transparent', checked: bg.kind === 'transparent', onSelect: () => setBackground({ kind: 'transparent' }) },
        ]}
      />
      <input
        ref={file}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload a background image"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            setBackground({ kind: 'image', src: await backgroundDataUrl(f) });
          } catch {
            showToast("That file isn't an image WeShot can read.");
          }
        }}
      />
    </>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-h-[44px] items-center justify-between gap-3 text-[14px] text-white/[0.85]">
      {label}
      <span className="inline-flex items-center gap-2">
        <span className="font-mono text-[13px] text-ws-text-2">{value.toUpperCase()}</span>
        <input
          type="color"
          value={value.length === 7 ? value : '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-11 cursor-pointer rounded-[10px] border border-white/[0.18] bg-transparent p-0.5"
        />
      </span>
    </label>
  );
}

export function BackgroundControls({ columns = 3, showMore = true }: { columns?: 3 | 6; showMore?: boolean }) {
  const frame = useEditor((s) => s.frame);
  const setFrame = useEditor((s) => s.setFrame);
  const setBackground = useEditor((s) => s.setBackground);
  const bg = frame.background;

  return (
    <div className="flex flex-col gap-3">
      <BackgroundSwatches columns={columns} />
      {bg.kind === 'solid' ? <ColorField label="Color" value={bg.color} onChange={(color) => setBackground({ kind: 'solid', color })} /> : null}
      {bg.kind === 'gradient' ? (
        <>
          <ColorField label="From" value={bg.from} onChange={(from) => setBackground({ ...bg, from })} />
          <ColorField label="To" value={bg.to} onChange={(to) => setBackground({ ...bg, to })} />
          <Slider label="Angle" value={bg.angle} min={0} max={360} format={(v) => `${v}°`} onChange={(angle) => setBackground({ ...bg, angle })} />
        </>
      ) : null}
      <Slider
        label="Blur"
        value={frame.blur}
        min={0}
        max={40}
        format={(v) => `${v} px`}
        onChange={(blur) => setFrame({ blur })}
        disabled={bg.kind === 'transparent'}
      />
      <Slider
        label="Grain"
        value={frame.grain}
        min={0}
        max={20}
        format={(v) => `${v}%`}
        onChange={(grain) => setFrame({ grain })}
        disabled={bg.kind === 'transparent'}
      />
      {showMore ? (
        <div className="flex justify-end">
          <BackgroundMoreMenu />
        </div>
      ) : null}
    </div>
  );
}
