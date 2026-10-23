'use client';

import { ChevronDown } from 'lucide-react';
import type { TitleBar } from '@weshot/shared';
import { useEditor } from '@/lib/store';
import { Menu } from '../ui/Menu';
import { OptionButton } from '../ui/OptionButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Row, menuTriggerClass } from './Row';

const TITLE_LABEL = { url: 'URL pill', title: 'Page title', empty: 'Empty', custom: 'Custom text' } as const;

function titleKind(tb: TitleBar): keyof typeof TITLE_LABEL {
  return typeof tb === 'object' ? 'custom' : tb;
}

export function WindowControls() {
  const win = useEditor((s) => s.frame.window);
  const setWindow = useEditor((s) => s.setWindow);
  const kind = titleKind(win.titleBar);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Window style" className="grid grid-cols-3 gap-2">
        {(
          [
            ['macos', 'macOS'],
            ['safari', 'Safari'],
            ['none', 'None'],
          ] as const
        ).map(([value, label]) => (
          <OptionButton key={value} selected={win.style === value} onClick={() => setWindow({ style: value })}>
            {label}
          </OptionButton>
        ))}
      </div>
      <SegmentedControl
        label="Window theme"
        value={win.theme}
        onChange={(theme) => setWindow({ theme })}
        options={[
          { value: 'dark', label: 'Dark glass' },
          { value: 'light', label: 'Light glass' },
        ]}
        className="w-full"
      />
      <Row label="Title bar">
        <Menu
          label={`Title bar, ${TITLE_LABEL[kind]}`}
          triggerClassName={menuTriggerClass}
          disabled={win.style === 'none'}
          trigger={
            <>
              {TITLE_LABEL[kind]}
              <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
            </>
          }
          items={(['url', 'title', 'empty', 'custom'] as const).map((k) => ({
            id: k,
            label: TITLE_LABEL[k],
            checked: kind === k,
            onSelect: () => setWindow({ titleBar: k === 'custom' ? { custom: typeof win.titleBar === 'object' ? win.titleBar.custom : '' } : k }),
          }))}
        />
      </Row>
      {typeof win.titleBar === 'object' ? (
        <label className="flex flex-col gap-1 text-[13px] text-ws-text-3">
          Title bar text
          <input
            type="text"
            maxLength={120}
            value={win.titleBar.custom}
            onChange={(e) => setWindow({ titleBar: { custom: e.target.value } })}
            className="h-11 rounded-[12px] border border-white/[0.14] bg-black/25 px-3 text-[14px] text-white"
          />
        </label>
      ) : null}
      <Row label="Traffic lights" stack>
        <SegmentedControl
          label="Traffic lights"
          value={win.lights}
          onChange={(lights) => setWindow({ lights })}
          disabled={win.style === 'none'}
          size="sm"
          className="w-full"
          options={[
            { value: 'color', label: 'Color' },
            { value: 'mono', label: 'Mono' },
            { value: 'hidden', label: 'Hidden' },
          ]}
        />
      </Row>
    </div>
  );
}
