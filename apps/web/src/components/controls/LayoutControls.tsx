'use client';

import { ChevronDown } from 'lucide-react';
import { SIZE_PRESETS, type CanvasSetting } from '@weshot/shared';
import { useEditor } from '@/lib/store';
import { Menu } from '../ui/Menu';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Slider } from '../ui/Slider';
import { Row, menuTriggerClass } from './Row';

export function canvasLabel(canvas: CanvasSetting): { name: string; size: string | null } {
  if (canvas === 'auto') return { name: 'Auto', size: null };
  if (typeof canvas === 'string') {
    const p = SIZE_PRESETS.find((s) => s.id === canvas)!;
    return { name: p.name, size: `${p.width} × ${p.height}` };
  }
  return { name: 'Custom', size: `${canvas.width} × ${canvas.height}` };
}

export function CanvasMenu() {
  const canvas = useEditor((s) => s.frame.canvas);
  const setFrame = useEditor((s) => s.setFrame);
  const { name, size } = canvasLabel(canvas);
  return (
    <Menu
      label={`Canvas, ${name}${size ? `, ${size}` : ''}`}
      triggerClassName={menuTriggerClass}
      trigger={
        <>
          <span>
            {name}
            {size ? (
              <>
                , <span className="font-mono text-[13px]">{size}</span>
              </>
            ) : null}
          </span>
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </>
      }
      items={[
        { id: 'auto', label: 'Auto', checked: canvas === 'auto', onSelect: () => setFrame({ canvas: 'auto' }) },
        { kind: 'separator', id: 'sep' },
        ...SIZE_PRESETS.map((p) => ({
          id: p.id,
          label: p.name,
          hint: `${p.width} × ${p.height}`,
          checked: canvas === p.id,
          onSelect: () => setFrame({ canvas: p.id }),
        })),
      ]}
    />
  );
}

export function LayoutControls() {
  const frame = useEditor((s) => s.frame);
  const setFrame = useEditor((s) => s.setFrame);
  const setWindow = useEditor((s) => s.setWindow);
  return (
    <div className="flex flex-col gap-3">
      <Slider label="Padding" value={frame.padding} min={0} max={200} format={(v) => `${v} px`} onChange={(padding) => setFrame({ padding })} />
      <Slider
        label="Corner radius"
        value={frame.window.radius}
        min={0}
        max={24}
        format={(v) => `${v} px`}
        onChange={(radius) => setWindow({ radius })}
      />
      <SegmentedControl
        label="Shadow"
        value={frame.shadow}
        onChange={(shadow) => setFrame({ shadow })}
        options={[
          { value: 'none', label: 'No shadow' },
          { value: 'soft', label: 'Soft' },
          { value: 'deep', label: 'Deep' },
        ]}
        className="w-full"
        buttonClassName="!px-1.5"
      />
      <Row label="Canvas" stack>
        <CanvasMenu />
      </Row>
      <Slider
        label="Window scale"
        value={Math.round(frame.windowScale * 100)}
        min={50}
        max={200}
        step={5}
        format={(v) => `${v}%`}
        onChange={(v) => setFrame({ windowScale: v / 100 })}
      />
      <Slider
        label="Offset X"
        value={frame.windowOffset.x}
        min={-800}
        max={800}
        step={10}
        format={(v) => `${v} px`}
        onChange={(x) => setFrame({ windowOffset: { ...frame.windowOffset, x } })}
      />
      <Slider
        label="Offset Y"
        value={frame.windowOffset.y}
        min={-800}
        max={800}
        step={10}
        format={(v) => `${v} px`}
        onChange={(y) => setFrame({ windowOffset: { ...frame.windowOffset, y } })}
      />
    </div>
  );
}
