'use client';

import { looksLikeUrl } from '@weshot/shared';
import { useEffect, useRef, useState } from 'react';
import { loadImageFile, submitBar } from '@/lib/actions';
import { imageFromDataTransfer } from '@/lib/image';
import { useEditor } from '@/lib/store';

function isOtherField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute('data-paste-bar')) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/**
 * Page-wide input (UI spec §2.3): paste an image anywhere, paste a link to fill the bar and auto-submit,
 * drop an image anywhere (full-page overlay "Drop to frame it"). Also owns the hidden image picker.
 */
export function PageInput() {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFromDataTransfer(e.clipboardData);
      if (file) {
        // Text fields cannot hold images, so an image pasted anywhere is framed.
        e.preventDefault();
        void loadImageFile(file);
        return;
      }
      if (isOtherField(e.target)) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (looksLikeUrl(text)) {
        e.preventDefault();
        useEditor.getState().setBarValue(text.trim());
        submitBar(text.trim());
      }
    };
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = imageFromDataTransfer(e.dataTransfer);
      if (file) void loadImageFile(file);
    };
    document.addEventListener('paste', onPaste);
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return (
    <>
      <input
        id="ws-image-input"
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload an image"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void loadImageFile(f);
        }}
      />
      {dragging ? (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] bg-black/40">
          <div className="glass-panel absolute inset-4 flex items-center justify-center rounded-shell border-2 border-dashed !border-ws-yellow">
            <p className="text-[28px] font-semibold tracking-[-0.02em]">Drop to frame it</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
