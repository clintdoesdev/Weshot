import { z } from 'zod';
import { BACKGROUND_IDS } from './backgrounds';
import { LIMITS, SIZE_PRESET_IDS } from './constants';

const hexColor = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Expected a hex color');

// ---------- capture (product spec §4.4) ----------

export const captureSettingsSchema = z.object({
  url: z.string().url().max(2048),
  viewport: z.object({
    width: z.number().int().min(320).max(3840),
    height: z.number().int().min(320).max(2160),
  }),
  scale: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  fullPage: z.boolean(),
  colorScheme: z.enum(['light', 'dark', 'auto']),
  delayMs: z.number().int().min(0).max(LIMITS.maxDelayMs),
  hideBanners: z.boolean(),
});
export type CaptureSettings = z.infer<typeof captureSettingsSchema>;

// ---------- frame ----------

export const titleBarSchema = z.union([
  z.enum(['url', 'title', 'empty']),
  z.object({ custom: z.string().max(120) }),
]);
export type TitleBar = z.infer<typeof titleBarSchema>;

export const backgroundSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('preset'), id: z.enum(BACKGROUND_IDS) }),
  z.object({ kind: z.literal('solid'), color: hexColor }),
  z.object({ kind: z.literal('gradient'), from: hexColor, to: hexColor, angle: z.number().min(0).max(360) }),
  z.object({ kind: z.literal('image'), src: z.string().min(1) }),
  z.object({ kind: z.literal('transparent') }),
]);
export type BackgroundSetting = z.infer<typeof backgroundSchema>;

export const canvasSchema = z.union([
  z.literal('auto'),
  z.enum(SIZE_PRESET_IDS),
  z.object({ width: z.number().int().min(200).max(8000), height: z.number().int().min(200).max(8000) }),
]);
export type CanvasSetting = z.infer<typeof canvasSchema>;

export const frameSettingsSchema = z.object({
  window: z.object({
    style: z.enum(['macos', 'safari', 'none']),
    theme: z.enum(['dark', 'light']),
    titleBar: titleBarSchema,
    lights: z.enum(['color', 'mono', 'hidden']),
    radius: z.number().min(0).max(24),
  }),
  background: backgroundSchema,
  blur: z.number().min(0).max(40),
  grain: z.number().min(0).max(20),
  padding: z.number().min(0).max(200),
  shadow: z.enum(['none', 'soft', 'deep']),
  canvas: canvasSchema,
  windowScale: z.number().min(0.5).max(2),
  windowOffset: z.object({ x: z.number().min(-2000).max(2000), y: z.number().min(-2000).max(2000) }),
});
export type FrameSettings = z.infer<typeof frameSettingsSchema>;
export type WindowStyle = FrameSettings['window']['style'];
export type WindowTheme = FrameSettings['window']['theme'];
export type ShadowKind = FrameSettings['shadow'];

export const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type Rect = z.infer<typeof rectSchema>;

export const captureRequestSchema = z.object({
  capture: captureSettingsSchema,
  /** Only checked when Turnstile is configured. */
  turnstileToken: z.string().max(4096).optional(),
});
export type CaptureRequest = z.infer<typeof captureRequestSchema>;

// ---------- user presets: localStorage + JSON import/export ----------

export const userPresetSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  frame: frameSettingsSchema,
});

export const presetFileSchema = z.object({
  app: z.literal('weshot'),
  version: z.literal(1),
  presets: z.array(userPresetSchema).max(100),
});
export type PresetFile = z.infer<typeof presetFileSchema>;
