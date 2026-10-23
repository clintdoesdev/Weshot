import type { Rect } from '@weshot/shared';

export type { Rect };

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Anything drawable with a known pixel size. */
export type FrameSource = CanvasImageSource & { width: number; height: number };

export type Size = { width: number; height: number };

export type FrameOutput = {
  /** Output size in canvas px at 1x. The context's canvas must be `width × scale` by `height × scale`. */
  width: number;
  height: number;
  scale: number;
};

/** Things the frame draws that are not part of FrameSettings. */
export type FrameResources = {
  /** Decoded image for `background.kind === 'image'`. */
  backgroundImage?: FrameSource | null;
  /** Full URL shown in the URL pill / Safari address bar. */
  url?: string | null;
  /** Page title shown when the title bar is set to "title". */
  title?: string | null;
  /** Font stack for title bar text. */
  fontFamily?: string;
  /**
   * Size of the page image when `source` is null (video templates), used for layout.
   * Defaults to 1440 × 900.
   */
  sourceSize?: Size;
};

export type FrameLayout = {
  canvas: Size;
  /** Chrome unit: UI spec §2.11 sizes are multiplied by this. */
  unit: number;
  window: Rect;
  radius: number;
  titleBar: Rect | null;
  content: Rect;
  /** Region of the source image that is visible in the content rect, in source px. */
  sourceCrop: Rect;
};

export type RenderResult = {
  /** Where the page image sits, in output px (1x). */
  contentRect: Rect;
  /** Radius of the content area's bottom corners (top corners too when there is no title bar), in output px. */
  contentRadius: number;
  layout: FrameLayout;
};
