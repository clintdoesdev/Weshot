'use client';

import { ChevronDown } from 'lucide-react';
import { VIEWPORT_PRESETS } from '@weshot/shared';
import { useState } from 'react';
import { useEditor } from '@/lib/store';
import { LinkOnly } from '../ui/LinkOnly';
import { Menu } from '../ui/Menu';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { Row, menuTriggerClass } from './Row';

export function CaptureControls() {
  const capture = useEditor((s) => s.capture);
  const setCapture = useEditor((s) => s.setCapture);
  const enabled = useEditor((s) => s.source.kind !== 'image');
  const [custom, setCustom] = useState(false);
  const { width, height } = capture.viewport;
  const preset = VIEWPORT_PRESETS.find((p) => p.width === width && p.height === height);

  return (
    <LinkOnly enabled={enabled} className="flex flex-col gap-2">
      <Row label="Viewport">
        <Menu
          label={`Viewport, ${width} × ${height}`}
          triggerClassName={menuTriggerClass}
          trigger={
            <>
              <span className="font-mono text-[13px]">
                {width} × {height}
              </span>
              <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
            </>
          }
          items={[
            ...VIEWPORT_PRESETS.map((p) => ({
              id: p.id,
              label: p.name,
              hint: `${p.width} × ${p.height}`,
              checked: !custom && p === preset,
              onSelect: () => {
                setCustom(false);
                setCapture({ viewport: { width: p.width, height: p.height } });
              },
            })),
            { kind: 'separator' as const, id: 'sep' },
            { id: 'custom', label: 'Custom size', checked: custom || !preset, onSelect: () => setCustom(true) },
          ]}
        />
      </Row>
      {custom || !preset ? (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Width" value={width} min={320} max={3840} onChange={(v) => setCapture({ viewport: { width: v, height } })} />
          <NumberField label="Height" value={height} min={320} max={2160} onChange={(v) => setCapture({ viewport: { width, height: v } })} />
        </div>
      ) : null}
      <Row label="Scale" stack>
        <SegmentedControl
          label="Device scale"
          value={capture.scale}
          onChange={(scale) => setCapture({ scale })}
          options={[
            { value: 1, label: '1x' },
            { value: 2, label: '2x' },
            { value: 3, label: '3x' },
          ]}
          className="w-full"
          size="sm"
        />
      </Row>
      <Toggle label="Full page" checked={capture.fullPage} onChange={(fullPage) => setCapture({ fullPage })} />
      <Toggle label="Hide cookie banners" checked={capture.hideBanners} onChange={(hideBanners) => setCapture({ hideBanners })} />
      <Row label="Color scheme" stack>
        <SegmentedControl
          label="Color scheme"
          value={capture.colorScheme}
          onChange={(colorScheme) => setCapture({ colorScheme })}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          size="sm"
          className="w-full"
        />
      </Row>
      <Slider
        label="Delay"
        value={capture.delayMs / 1000}
        min={0}
        max={10}
        step={0.5}
        format={(v) => `${v} s`}
        onChange={(v) => setCapture({ delayMs: Math.round(v * 1000) })}
      />
    </LinkOnly>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const n = Math.round(Number(draft));
    const v = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value;
    setDraft(String(v));
    onChange(v);
  };
  return (
    <label className="flex flex-col gap-1 text-[13px] text-ws-text-3">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="h-11 rounded-[12px] border border-white/[0.14] bg-black/25 px-3 font-mono text-[14px] text-white"
      />
    </label>
  );
}
