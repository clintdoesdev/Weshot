'use client';

import { Download } from 'lucide-react';
import { useRef } from 'react';
import { downloadCurrent } from '@/lib/actions';
import { prefersReducedMotion } from '@/lib/motion';
import { EDITOR_TABS, useEditor, type EditorTab } from '@/lib/store';
import { BackgroundControls, BackgroundMoreMenu } from '../controls/BackgroundControls';
import { CaptureControls } from '../controls/CaptureControls';
import { ExportControls } from '../controls/ExportControls';
import { LayoutControls } from '../controls/LayoutControls';
import { WindowControls } from '../controls/WindowControls';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ControlTile } from './ControlTile';
import { DeviceSwitcher } from './DeviceSwitcher';
import { EditorUrlRow } from './EditorUrlRow';
import { PresetChips } from './PresetChips';
import { PreviewStage } from './PreviewStage';
import { handleEditorKeyDown } from './shortcuts';
import { ZoomControls } from './ZoomControls';

const TILE_TITLE: Record<EditorTab, string> = {
  capture: 'Capture',
  frame: 'Window',
  background: 'Background',
  layout: 'Layout',
  export: 'Export',
};

const tileId = (tab: EditorTab) => `tile-${tab}`;

/** Desktop and tablet editor (UI spec §3.1 item 3). All six tiles stay visible; tabs highlight one. */
export function Editor() {
  const activeTab = useEditor((s) => s.activeTab);
  const setActiveTab = useEditor((s) => s.setActiveTab);
  const isUrl = useEditor((s) => s.source.kind === 'url');
  const tiles = useRef<Partial<Record<EditorTab, HTMLElement | null>>>({});

  const focusTile = (tab: EditorTab) => {
    tiles.current[tab]?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <div
      className="glass-panel flex flex-col gap-3 rounded-shell p-3.5"
      onKeyDown={(e) => handleEditorKeyDown(e, focusTile)}
    >
      {isUrl ? <EditorUrlRow /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Editor sections"
          mode="tabs"
          variant="primary"
          shape="pill"
          size="lg"
          value={activeTab}
          wrap
          onChange={(tab) => {
            setActiveTab(tab);
            focusTile(tab);
          }}
          options={EDITOR_TABS.map((t) => ({ value: t.id, label: t.label, id: `tab-${t.id}`, controls: tileId(t.id) }))}
          buttonClassName="!flex-none px-[18px] text-[15px]"
        />
        <div className="flex items-center gap-3">
          <DeviceSwitcher />
          <button
            type="button"
            onClick={() => void downloadCurrent()}
            className="btn-primary inline-flex h-12 items-center gap-2 rounded-pill px-6 text-[16px]"
          >
            <Download size={18} strokeWidth={1.75} aria-hidden="true" />
            Download
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-2.5 rounded-[22px] bg-ws-well p-2.5">
          <PreviewStage variant="desktop" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-1.5 pb-1">
            <PresetChips />
            <ZoomControls />
          </div>
        </div>
        <div className="grid min-w-0 flex-[1_1_460px] grid-cols-1 content-start gap-3 sm:grid-cols-2">
          {(Object.keys(TILE_TITLE) as EditorTab[]).map((tab) => (
            <ControlTile
              key={tab}
              ref={(el) => {
                tiles.current[tab] = el;
              }}
              id={tileId(tab)}
              title={TILE_TITLE[tab]}
              active={activeTab === tab}
              aside={tab === 'background' ? <BackgroundMoreMenu /> : undefined}
            >
              {tab === 'capture' ? <CaptureControls /> : null}
              {tab === 'frame' ? <WindowControls /> : null}
              {tab === 'background' ? <BackgroundControls showMore={false} /> : null}
              {tab === 'layout' ? <LayoutControls /> : null}
              {tab === 'export' ? <ExportControls /> : null}
            </ControlTile>
          ))}
        </div>
      </div>
    </div>
  );
}

