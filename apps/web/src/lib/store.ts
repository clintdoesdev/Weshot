'use client';

import { create } from 'zustand';
import {
  DEFAULT_CAPTURE,
  DEFAULT_FRAME,
  DEFAULT_RECORD,
  type BackgroundSetting,
  type CaptureSettings,
  type ExportScale,
  type FrameSettings,
  type ImageFormat,
  type RecordSettings,
  type VideoFormat,
} from '@weshot/shared';

export const EDITOR_TABS = [
  { id: 'capture', label: 'Capture' },
  { id: 'frame', label: 'Frame' },
  { id: 'background', label: 'Background' },
  { id: 'layout', label: 'Layout' },
  { id: 'record', label: 'Record' },
  { id: 'export', label: 'Export' },
] as const;
export type EditorTab = (typeof EDITOR_TABS)[number]['id'];

export type CaptureOptions = Omit<CaptureSettings, 'url'>;

export type Source =
  | { kind: 'demo'; bitmap: ImageBitmap | null }
  | { kind: 'image'; bitmap: ImageBitmap; name: string }
  | {
      kind: 'url';
      url: string;
      bitmap: ImageBitmap | null;
      title: string | null;
      truncated: boolean;
    };

export type CaptureStep = 'loading' | 'fonts' | 'framing';

export type Phase =
  | { kind: 'idle' }
  | { kind: 'capturing'; step: CaptureStep }
  | { kind: 'error'; code: string; message: string };

export type Toast = { id: number; message: string; action?: { label: string; run: () => void } };

export type VideoResult = { url: string; format: VideoFormat; width: number; height: number };

export type RecordingState =
  | { kind: 'idle' }
  | { kind: 'recording'; elapsedSec: number; totalSec: number; progress: number; status: string }
  | { kind: 'error'; message: string };

type State = {
  source: Source;
  /** Bumped whenever a new source appears, to replay the fade-in. */
  sourceVersion: number;
  frame: FrameSettings;
  capture: CaptureOptions;
  /** Capture settings used for the current URL capture; differences show the Re-capture pill. */
  capturedWith: CaptureOptions | null;
  record: RecordSettings;
  exportFormat: ImageFormat | VideoFormat;
  exportScale: ExportScale;
  activeTab: EditorTab;
  phase: Phase;
  barValue: string;
  /** Decoded image for `frame.background.kind === 'image'`. */
  backgroundImage: ImageBitmap | null;
  toast: Toast | null;
  /** Preview zoom; null = fit. */
  zoom: number | null;
  fitZoom: number;
  mobileEditorOpen: boolean;
  downloadSheetOpen: boolean;
  shortcutsOpen: boolean;
  video: VideoResult | null;
  recording: RecordingState;
};

type Actions = {
  setFrame: (patch: Partial<FrameSettings>) => void;
  setWindow: (patch: Partial<FrameSettings['window']>) => void;
  setBackground: (bg: BackgroundSetting) => void;
  applyFrame: (frame: FrameSettings) => void;
  setCapture: (patch: Partial<CaptureOptions>) => void;
  setRecord: (patch: Partial<RecordSettings>) => void;
  setExportFormat: (f: ImageFormat | VideoFormat) => void;
  setExportScale: (s: ExportScale) => void;
  setActiveTab: (t: EditorTab) => void;
  setSource: (s: Source) => void;
  setPhase: (p: Phase) => void;
  setBarValue: (v: string) => void;
  setBackgroundImage: (b: ImageBitmap | null) => void;
  showToast: (message: string, action?: Toast['action']) => void;
  dismissToast: (id: number) => void;
  setZoom: (z: number | null) => void;
  setFitZoom: (z: number) => void;
  setMobileEditorOpen: (open: boolean) => void;
  setDownloadSheetOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setVideo: (v: VideoResult | null) => void;
  setRecording: (r: RecordingState) => void;
  setCapturedWith: (c: CaptureOptions | null) => void;
};

let toastId = 0;

export const useEditor = create<State & Actions>()((set) => ({
  source: { kind: 'demo', bitmap: null },
  sourceVersion: 0,
  frame: DEFAULT_FRAME,
  capture: DEFAULT_CAPTURE,
  capturedWith: null,
  record: DEFAULT_RECORD,
  exportFormat: 'png',
  exportScale: 2,
  activeTab: 'background',
  phase: { kind: 'idle' },
  barValue: '',
  backgroundImage: null,
  toast: null,
  zoom: null,
  fitZoom: 1,
  mobileEditorOpen: false,
  downloadSheetOpen: false,
  shortcutsOpen: false,
  video: null,
  recording: { kind: 'idle' },

  setFrame: (patch) => set((s) => ({ frame: { ...s.frame, ...patch } })),
  setWindow: (patch) => set((s) => ({ frame: { ...s.frame, window: { ...s.frame.window, ...patch } } })),
  setBackground: (background) => set((s) => ({ frame: { ...s.frame, background } })),
  applyFrame: (frame) => set({ frame: structuredClone(frame) }),
  setCapture: (patch) =>
    set((s) => ({
      capture: { ...s.capture, ...patch, viewport: { ...s.capture.viewport, ...(patch.viewport ?? {}) } },
    })),
  setRecord: (patch) => set((s) => ({ record: { ...s.record, ...patch } })),
  setExportFormat: (exportFormat) => set({ exportFormat }),
  setExportScale: (exportScale) => set({ exportScale }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSource: (source) =>
    set((s) => {
      const prev = s.source;
      if (prev.bitmap && prev.bitmap !== source.bitmap && prev.kind !== 'demo') prev.bitmap.close();
      return { source, sourceVersion: s.sourceVersion + 1 };
    }),
  setPhase: (phase) => set({ phase }),
  setBarValue: (barValue) => set({ barValue }),
  setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
  showToast: (message, action) => set({ toast: { id: ++toastId, message, ...(action ? { action } : {}) } }),
  dismissToast: (id) => set((s) => (s.toast?.id === id ? { toast: null } : {})),
  setZoom: (zoom) => set({ zoom }),
  setFitZoom: (fitZoom) => set({ fitZoom }),
  setMobileEditorOpen: (mobileEditorOpen) => set({ mobileEditorOpen }),
  setDownloadSheetOpen: (downloadSheetOpen) => set({ downloadSheetOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setVideo: (video) => set({ video }),
  setRecording: (recording) => set({ recording }),
  setCapturedWith: (capturedWith) => set({ capturedWith }),
}));

/** Link-only controls are disabled for pasted images (product spec §3.2). */
export function isLinkMode(source: Source): boolean {
  return source.kind === 'url';
}

export function sameCapture(a: CaptureOptions, b: CaptureOptions): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function sourceUrl(source: Source): string | null {
  if (source.kind === 'url') return source.url;
  if (source.kind === 'demo') return 'https://queuely.app/';
  return null;
}

export function sourceTitle(source: Source): string | null {
  if (source.kind === 'url') return source.title;
  if (source.kind === 'demo') return 'Queuely';
  return null;
}
