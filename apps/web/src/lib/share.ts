'use client';

import { useEditor } from './store';

/** Share links; implemented in phase 6. */
export async function openShare(): Promise<void> {
  useEditor.getState().showToast('Share links are not available yet.');
}
