import type { CaptureSettings, FrameSettings } from './schemas';

export type FramePreset = { id: string; name: string; frame: FrameSettings };

export const DEFAULT_FRAME: FrameSettings = {
  window: { style: 'macos', theme: 'dark', titleBar: 'url', lights: 'color', radius: 14 },
  background: { kind: 'preset', id: 'honey' },
  blur: 0,
  grain: 0,
  padding: 52,
  shadow: 'soft',
  canvas: 'x-post',
  windowScale: 1,
  windowOffset: { x: 0, y: 0 },
};

/** The three built-in presets, product spec §2.1. "Launch post" is the default look. */
export const BUILT_IN_PRESETS: readonly FramePreset[] = [
  { id: 'launch-post', name: 'Launch post', frame: DEFAULT_FRAME },
  {
    id: 'portfolio',
    name: 'Portfolio',
    frame: {
      window: { style: 'safari', theme: 'light', titleBar: 'url', lights: 'color', radius: 16 },
      background: { kind: 'preset', id: 'midnight' },
      blur: 0,
      grain: 6,
      padding: 88,
      shadow: 'deep',
      canvas: 'dribbble',
      windowScale: 1,
      windowOffset: { x: 0, y: 0 },
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    frame: {
      window: { style: 'macos', theme: 'light', titleBar: 'empty', lights: 'mono', radius: 12 },
      background: { kind: 'preset', id: 'paper' },
      blur: 0,
      grain: 0,
      padding: 40,
      shadow: 'soft',
      canvas: 'auto',
      windowScale: 1,
      windowOffset: { x: 0, y: 0 },
    },
  },
];

/** Gallery examples on the landing page (UI spec §3.1 item 4). Each one is a preset. */
export type GalleryExample = FramePreset & { caption: string; showPhone?: boolean };

export const GALLERY_EXAMPLES: readonly GalleryExample[] = [
  {
    id: 'honey-dark',
    name: 'Honey, dark glass',
    caption: 'Honey with dark glass',
    frame: DEFAULT_FRAME,
  },
  {
    id: 'midnight-light',
    name: 'Midnight glow, light glass',
    caption: 'Midnight glow with light glass',
    frame: { ...DEFAULT_FRAME, window: { ...DEFAULT_FRAME.window, theme: 'light' }, background: { kind: 'preset', id: 'midnight' }, shadow: 'deep' },
  },
  {
    id: 'graphite-cropped',
    name: 'Graphite, cropped corner',
    caption: 'Graphite with a cropped corner',
    frame: {
      ...DEFAULT_FRAME,
      background: { kind: 'preset', id: 'graphite' },
      shadow: 'deep',
      windowScale: 1.25,
      windowOffset: { x: 260, y: 200 },
    },
  },
  {
    id: 'lemon-devices',
    name: 'Lemon, desktop and phone',
    caption: 'Lemon with desktop and phone',
    showPhone: true,
    frame: { ...DEFAULT_FRAME, window: { ...DEFAULT_FRAME.window, theme: 'light' }, background: { kind: 'preset', id: 'lemon' } },
  },
];

export const DEFAULT_CAPTURE: Omit<CaptureSettings, 'url'> = {
  viewport: { width: 1440, height: 900 },
  scale: 2,
  fullPage: false,
  colorScheme: 'auto',
  delayMs: 0,
  hideBanners: true,
};
