'use client';

import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { VIEWPORT_PRESETS } from '@weshot/shared';
import { useEditor } from '@/lib/store';
import { LinkOnly } from '../ui/LinkOnly';
import { SegmentedControl } from '../ui/SegmentedControl';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', Icon: Monitor },
  { id: 'tablet', label: 'Tablet', Icon: Tablet },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
] as const;

export function DeviceSwitcher() {
  const viewport = useEditor((s) => s.capture.viewport);
  const setCapture = useEditor((s) => s.setCapture);
  const enabled = useEditor((s) => s.source.kind !== 'image');
  const current = VIEWPORT_PRESETS.find((p) => p.width === viewport.width && p.height === viewport.height)?.id ?? 'custom';
  return (
    <LinkOnly enabled={enabled}>
      <SegmentedControl
        label="Device"
        value={current}
        onChange={(id) => {
          const p = VIEWPORT_PRESETS.find((v) => v.id === id);
          if (p) setCapture({ viewport: { width: p.width, height: p.height } });
        }}
        options={DEVICES.map((d) => ({
          value: d.id,
          ariaLabel: d.label,
          label: <d.Icon size={18} strokeWidth={1.75} aria-hidden="true" />,
        }))}
        buttonClassName="!h-10 !w-11 !flex-none !px-0"
        shape="pill"
      />
    </LinkOnly>
  );
}
