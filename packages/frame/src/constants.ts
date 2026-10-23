/** Window chrome measurements from UI spec §2.11, in window units (see `unit` in FrameLayout). */
export const CHROME = {
  /** Chrome sizes in the UI spec are given for a window this wide in the preview stage. */
  referenceWidth: 640,
  titleBar: { macos: 42, safari: 52, none: 0 },
  lightSize: 12,
  lightGap: 8,
  lightLeft: 14,
  pillFontSize: 12,
  pillPadX: 16,
  pillPadY: 5,
  titleFontSize: 13,
  titleBarBlur: 20,
  safariFieldHeight: 30,
  safariFieldRadius: 9,
} as const;

export const COLORS = {
  chrome: { dark: 'rgba(28, 28, 30, 0.88)', light: 'rgba(245, 245, 247, 0.88)' },
  windowBase: { dark: '#1C1C1E', light: '#FFFFFF' },
  border: { dark: 'rgba(255, 255, 255, 0.14)', light: 'rgba(0, 0, 0, 0.10)' },
  separator: { dark: 'rgba(0, 0, 0, 0.45)', light: 'rgba(0, 0, 0, 0.08)' },
  pillFill: { dark: 'rgba(255, 255, 255, 0.12)', light: 'rgba(0, 0, 0, 0.07)' },
  pillText: { dark: '#E5E5EA', light: '#3A3A3C' },
  lights: { red: '#FF5F57', yellow: '#FEBC2E', green: '#28C840' },
  lightsMono: { dark: 'rgba(255, 255, 255, 0.24)', light: 'rgba(0, 0, 0, 0.16)' },
  glyph: { dark: 'rgba(235, 235, 245, 0.55)', light: 'rgba(60, 60, 67, 0.55)' },
} as const;

/** Shadow layers, UI spec §2.11: [offsetY, blur, alpha] in window units. */
export const SHADOWS = {
  none: [] as Array<[number, number, number]>,
  soft: [
    [30, 70, 0.45],
    [8, 20, 0.3],
  ] as Array<[number, number, number]>,
  deep: [
    [50, 120, 0.6],
    [12, 30, 0.4],
  ] as Array<[number, number, number]>,
};

export const DEFAULT_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Inter', system-ui, sans-serif";

/** Fallback page size for layout when there is no source image (video template, empty state). */
export const DEFAULT_SOURCE_SIZE = { width: 1440, height: 900 } as const;

/**
 * Sources taller than this (height / width) are treated as full-page captures and cropped from the top in
 * fixed canvases. Phone screenshots (up to about 2.3 : 1) stay whole.
 */
export const TALL_SOURCE_ASPECT = 3;
