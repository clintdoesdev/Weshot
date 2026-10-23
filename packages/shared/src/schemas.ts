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

// ---------- record ----------

export const recordSettingsSchema = z
  .object({
    type: z.enum(['scroll', 'tour']),
    sections: z.array(z.string().min(1).max(200)).max(12).optional(),
    lengthSec: z.number().min(LIMITS.minVideoSec).max(LIMITS.maxVideoSec),
    easing: z.enum(['linear', 'easeInOut']),
    pauseAtHeadings: z.boolean(),
    cursor: z.boolean(),
    fps: z.union([z.literal(30), z.literal(60)]),
    format: z.enum(['mp4', 'webm', 'gif']),
  })
  .refine((r) => r.format !== 'gif' || r.lengthSec <= LIMITS.maxGifSec, {
    message: `GIFs can be at most ${LIMITS.maxGifSec} seconds`,
    path: ['lengthSec'],
  });
export type RecordSettings = z.infer<typeof recordSettingsSchema>;

export const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type Rect = z.infer<typeof rectSchema>;

// ---------- API bodies (product spec §4.5) ----------

export const captureRequestSchema = z.object({
  capture: captureSettingsSchema,
  turnstileToken: z.string().min(1).max(4096),
});
export type CaptureRequest = z.infer<typeof captureRequestSchema>;

export const recordRequestSchema = z.object({
  capture: captureSettingsSchema,
  record: recordSettingsSchema,
  templatePngKey: z.string().regex(/^templates\/[\w\-/.]+\.png$/),
  contentRect: rectSchema,
  /** Rounded-corner radius of the content area in video px, for the alpha mask. */
  contentRadius: z.number().min(0).max(200).optional(),
  /** Output video size in px (the size of the template). */
  output: z.object({ width: z.number().int().min(200).max(3840), height: z.number().int().min(200).max(3840) }),
  turnstileToken: z.string().min(1).max(4096),
});
export type RecordRequest = z.infer<typeof recordRequestSchema>;

export const uploadRequestSchema = z.object({
  kind: z.enum(['template', 'share']),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'image/gif']),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export const uploadResponseSchema = z.object({
  url: z.string(),
  key: z.string(),
  headers: z.record(z.string()),
});
export type UploadResponse = z.infer<typeof uploadResponseSchema>;

export const shareRequestSchema = z.object({
  key: z.string().regex(/^shares\/[\w\-/.]+$/),
  kind: z.enum(['image', 'video']),
  width: z.number().int().min(1).max(20_000),
  height: z.number().int().min(1).max(20_000),
});
export type ShareRequest = z.infer<typeof shareRequestSchema>;

export const shareResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  deleteToken: z.string(),
  expiresAt: z.string(),
});
export type ShareResponse = z.infer<typeof shareResponseSchema>;

export const JOB_STATUSES = ['queued', 'loading', 'fonts', 'capturing', 'encoding', 'done', 'failed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** One message on the job event channel (Redis pub/sub → SSE). */
export type JobEvent =
  | { type: 'status'; status: JobStatus }
  | { type: 'progress'; progress: number; elapsedSec?: number; totalSec?: number }
  | { type: 'result'; assetUrl: string; width?: number; height?: number; title?: string; truncated?: boolean }
  | { type: 'error'; code: string; message: string; status?: number };
