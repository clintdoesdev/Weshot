export const VIEWPORT_PRESETS = [
  { id: 'desktop', name: 'Desktop', width: 1440, height: 900 },
  { id: 'laptop', name: 'Laptop', width: 1280, height: 800 },
  { id: 'tablet', name: 'Tablet', width: 834, height: 1194 },
  { id: 'mobile', name: 'Mobile', width: 390, height: 844 },
] as const;

export type ViewportPresetId = (typeof VIEWPORT_PRESETS)[number]['id'];

export const SIZE_PRESETS = [
  { id: 'x-post', name: 'X post', width: 1600, height: 900 },
  { id: 'linkedin', name: 'LinkedIn', width: 1200, height: 627 },
  { id: 'instagram', name: 'Instagram', width: 1080, height: 1350 },
  { id: 'product-hunt', name: 'Product Hunt', width: 1270, height: 760 },
  { id: 'og-image', name: 'OG image', width: 1200, height: 630 },
  { id: 'dribbble', name: 'Dribbble', width: 1600, height: 1200 },
] as const;

export type SizePresetId = (typeof SIZE_PRESETS)[number]['id'];
export const SIZE_PRESET_IDS = SIZE_PRESETS.map((p) => p.id) as [SizePresetId, ...SizePresetId[]];

export function getSizePreset(id: SizePresetId) {
  const preset = SIZE_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown size preset ${id}`);
  return preset;
}

export const LIMITS = {
  capturesPerHour: 30,
  capturesPerDay: 150,
  recordingsPerHour: 5,
  recordingsPerDay: 20,
  concurrentJobsPerIp: 2,
  maxVideoSec: 60,
  minVideoSec: 5,
  maxGifSec: 15,
  gifWidth: 800,
  gifFps: 15,
  maxFullPageHeight: 16_000,
  maxImageBytes: 25 * 1024 * 1024,
  maxImageSide: 8_000,
  maxShareBytes: 50 * 1024 * 1024,
  shareTtlDays: 30,
  assetTtlHours: 24,
  jobRetentionDays: 30,
  maxRedirects: 5,
  navigationTimeoutMs: 30_000,
  maxResponseBytes: 50 * 1024 * 1024,
  networkIdleMaxMs: 10_000,
  maxDelayMs: 10_000,
} as const;

/** Longest content edge used when the canvas size is "auto" (see DECISIONS.md). */
export const AUTO_CANVAS_MAX_CONTENT_WIDTH = 1600;

export const EXPORT_SCALES = [1, 2, 4] as const;
export type ExportScale = (typeof EXPORT_SCALES)[number];

export const IMAGE_FORMATS = ['png', 'jpg', 'webp'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const VIDEO_FORMATS = ['mp4', 'webm', 'gif'] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export const MIME_TYPES: Record<ImageFormat | VideoFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  gif: 'image/gif',
};
