'use client';

import { Copy, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { copyImage } from '@/lib/actions';
import { EDITOR_TABS, useEditor } from '@/lib/store';
import { BackgroundControls } from '../controls/BackgroundControls';
import { CaptureControls } from '../controls/CaptureControls';
import { ExportControls } from '../controls/ExportControls';
import { LayoutControls } from '../controls/LayoutControls';
import { WindowControls } from '../controls/WindowControls';
import { PresetChips } from '../editor/PresetChips';
import { PreviewStage } from '../editor/PreviewStage';
import { handleEditorKeyDown } from '../editor/shortcuts';
import { PasteBar } from '../landing/PasteBar';
import { Glow } from '../ui/Glow';
import { Logo } from '../ui/Logo';
import { SegmentedControl } from '../ui/SegmentedControl';

/** Mobile editor, UI spec §3.4. Opened by Frame it, a paste/drop or a gallery card; closed by Back or the logo. */
export function MobileEditor() {
  const open = useEditor((s) => s.mobileEditorOpen);
  const setOpen = useEditor((s) => s.setMobileEditorOpen);
  const tab = useEditor((s) => s.activeTab);
  const setTab = useEditor((s) => s.setActiveTab);
  const setDownloadOpen = useEditor((s) => s.setDownloadSheetOpen);
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);

  useEffect(() => {
    const onPop = () => {
      if (location.hash !== '#editor') setOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Editor"
      // 100dvh: the visible screen, so the sheet's footer never hides behind the browser's toolbars.
      className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-ws-black md:hidden"
      onKeyDown={(e) => handleEditorKeyDown(e)}
    >
      <Glow style={{ width: 560, height: 560, left: '50%', top: 40, transform: 'translateX(-50%)' }} />
      <header className="relative flex h-14 shrink-0 items-center px-4">
        <button type="button" onClick={() => history.back()} aria-label="Back to the WeShot home page" className="rounded-[10px]">
          <Logo size="sm" />
        </button>
      </header>
      {expanded ? null : (
        <div className="relative shrink-0 px-4 pb-3">
          <PasteBar variant="compact" inputId="ws-paste-input-m" />
        </div>
      )}
      <div
        className="relative shrink-0 px-4 transition-[height] duration-[280ms] ease-sheet"
        // Collapsed: up to 290 px (UI spec §3.4) but never more than about a third of a short screen.
        style={{ height: expanded ? 'clamp(120px, 22dvh, 180px)' : 'clamp(150px, 30dvh, 290px)' }}
      >
        <PreviewStage variant="mobile" className="h-full" />
      </div>
      {expanded ? null : (
        <div className="relative shrink-0 px-4 py-3">
          <PresetChips scroll />
        </div>
      )}
      <div className={`glass-sheet relative flex min-h-0 flex-1 flex-col rounded-t-[30px] ${expanded ? 'mt-3' : ''}`}>
        {/* Grabber: tap, or drag up/down, to give the controls more or less of the screen. */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="mobile-tab-panel"
          aria-label={expanded ? 'Show the preview larger' : 'Show more controls'}
          onClick={() => {
            if (drag.current?.moved) return;
            setExpanded((x) => !x);
          }}
          onPointerDown={(e) => {
            drag.current = { y: e.clientY, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dy = e.clientY - d.y;
            if (Math.abs(dy) > 24 && !d.moved) {
              d.moved = true;
              setExpanded(dy < 0);
            }
          }}
          onPointerUp={() => {
            setTimeout(() => (drag.current = null), 0);
          }}
          className="flex h-8 w-full shrink-0 touch-none items-center justify-center rounded-t-[30px]"
        >
          <span aria-hidden="true" className="h-[5px] w-10 rounded-pill bg-white/30" />
        </button>
        <div className="no-scrollbar shrink-0 overflow-x-auto px-4 pt-1">
          <SegmentedControl
            label="Editor sections"
            mode="tabs"
            variant="primary"
            shape="pill"
            size="lg"
            value={tab}
            onChange={setTab}
            options={EDITOR_TABS.map((t) => ({ value: t.id, label: t.label, id: `mtab-${t.id}`, controls: 'mobile-tab-panel' }))}
            buttonClassName="!flex-none px-4"
          />
        </div>
        <div id="mobile-tab-panel" role="tabpanel" aria-labelledby={`mtab-${tab}`} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === 'capture' ? <CaptureControls /> : null}
          {tab === 'frame' ? <WindowControls /> : null}
          {tab === 'background' ? <BackgroundControls columns={6} /> : null}
          {tab === 'layout' ? <LayoutControls /> : null}
          {tab === 'export' ? <ExportControls /> : null}
        </div>
        <div className="flex shrink-0 gap-2.5 border-t border-white/10 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            aria-label="Copy image"
            onClick={() => void copyImage()}
            className="btn-secondary inline-flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[16px]"
          >
            <Copy size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDownloadOpen(true)}
            className="btn-primary inline-flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[16px] text-[17px]"
          >
            <Download size={20} strokeWidth={1.75} aria-hidden="true" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
