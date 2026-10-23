'use client';

import { DEFAULT_CAPTURE, errorMessage } from '@weshot/shared';
import { useEditor } from './store';

/** Placeholder until the capture API lands (phase 4). */
export async function startCapture(url: string): Promise<void> {
  const s = useEditor.getState();
  s.setCapture({ ...DEFAULT_CAPTURE, ...s.capture });
  s.setPhase({ kind: 'error', code: 'TIMEOUT', message: errorMessage('TIMEOUT') });
  void url;
}

export async function retryCapture(): Promise<void> {
  const v = useEditor.getState().barValue;
  if (v) await startCapture(v);
}

export async function recapture(): Promise<void> {
  await retryCapture();
}
