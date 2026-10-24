'use client';

import type { KeyboardEvent } from 'react';
import { copyImage, downloadCurrent } from '@/lib/actions';
import { recapture } from '@/lib/capture';
import { EDITOR_TABS, useEditor } from '@/lib/store';

function isField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/**
 * Editor keyboard shortcuts (UI spec §6). Registered on the editor region, ignored while a field has focus.
 * `onTab` lets the layout react to a tab switch (desktop scrolls the tile into view).
 */
export function handleEditorKeyDown(e: KeyboardEvent, onTab?: (tab: (typeof EDITOR_TABS)[number]['id']) => void): void {
  if (e.defaultPrevented || isField(e.target)) return;
  const mod = e.metaKey || e.ctrlKey;
  const s = useEditor.getState();
  if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'c') {
    if (window.getSelection()?.toString()) return;
    e.preventDefault();
    void copyImage();
  } else if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    void downloadCurrent();
  } else if (mod || e.altKey) {
    return;
  } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault();
    s.setShortcutsOpen(true);
  } else if (e.key.toLowerCase() === 'r' && !e.shiftKey) {
    if (s.source.kind === 'url') {
      e.preventDefault();
      void recapture();
    }
  } else if (new RegExp(`^[1-${EDITOR_TABS.length}]$`).test(e.key)) {
    const tab = EDITOR_TABS[Number(e.key) - 1]!.id;
    e.preventDefault();
    s.setActiveTab(tab);
    onTab?.(tab);
  }
}
