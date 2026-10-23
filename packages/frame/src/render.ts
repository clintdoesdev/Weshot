import type { FrameSettings } from '@weshot/shared';
import { paintBackground } from './background';
import { drawTitleBarContent } from './chrome';
import { CHROME, COLORS, DEFAULT_FONT_FAMILY, SHADOWS } from './constants';
import { roundRectPath } from './geometry';
import { applyGrain } from './grain';
import { computeLayout } from './layout';
import type { Ctx2D, FrameOutput, FrameResources, FrameSource, Rect, RenderResult, ScratchCanvas } from './types';

function sourceSize(source: FrameSource): { width: number; height: number } {
  // HTMLImageElement reports its layout size in width/height; the pixel size is in naturalWidth/Height.
  const img = source as { naturalWidth?: number; naturalHeight?: number };
  if (img.naturalWidth && img.naturalHeight) return { width: img.naturalWidth, height: img.naturalHeight };
  return { width: source.width, height: source.height };
}

function defaultCreateCanvas(width: number, height: number): ScratchCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function contentPath(ctx: Ctx2D, content: Rect, radius: number, hasTitleBar: boolean) {
  roundRectPath(ctx, content, hasTitleBar ? { bl: radius, br: radius } : radius);
}

function drawShadow(ctx: Ctx2D, win: Rect, radius: number, unit: number, scale: number, kind: FrameSettings['shadow']) {
  // Draw the shape far off-canvas and shift only its shadow back, so the window area itself is not painted.
  // Shadow offset and blur are in device px; they ignore the transform.
  const off = win.x + win.width + 10_000;
  for (const [dy, blur, alpha] of SHADOWS[kind]) {
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${alpha})`;
    ctx.shadowBlur = blur * unit * scale;
    ctx.shadowOffsetX = off * scale;
    ctx.shadowOffsetY = dy * unit * scale;
    ctx.beginPath();
    roundRectPath(ctx, { ...win, x: win.x - off }, radius);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Draws a framed screenshot. The one function behind preview, export and video templates.
 *
 * Draw order (product spec §4.3): background → grain → window shadow → window body with rounded clip →
 * title bar glass → traffic lights → title bar text → page image clipped to the content area.
 *
 * The rounded "clip" is done by masking a window layer with a filled path rather than ctx.clip():
 * clip anti-aliasing differs between a main-thread canvas and a worker OffscreenCanvas, fills do not,
 * so this keeps the preview and the download identical pixel for pixel.
 *
 * The context's canvas must be `output.width × output.scale` by `output.height × output.scale` device px.
 * The transform is reset; settings are in canvas px at 1x. Pass `source = null` to draw only the template,
 * leaving the content area transparent.
 */
export function renderFrame(
  ctx: Ctx2D,
  source: FrameSource | null,
  settings: FrameSettings,
  output: FrameOutput,
  resources: FrameResources = {},
): RenderResult {
  const { scale } = output;
  const res: FrameResources = { fontFamily: DEFAULT_FONT_FAMILY, ...resources };
  const size = source ? sourceSize(source) : (resources.sourceSize ?? null);
  const canvas = { width: output.width, height: output.height };
  const layout = computeLayout(settings, size, canvas);
  const { window: win, titleBar, content, unit, radius } = layout;
  const theme = settings.window.theme;
  const full = { x: 0, y: 0, ...canvas };
  const deviceW = Math.round(output.width * scale);
  const deviceH = Math.round(output.height * scale);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, deviceW, deviceH);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. background
  paintBackground(ctx, settings.background, full, settings.blur * scale, res.backgroundImage, settings.blur);

  // 2. grain (device px, deterministic)
  if (settings.grain > 0 && settings.background.kind !== 'transparent') applyGrain(ctx, 0, 0, deviceW, deviceH, settings.grain);

  // 3. shadow
  if (settings.shadow !== 'none') drawShadow(ctx, win, radius, unit, scale, settings.shadow);

  // 4–8. window body, drawn into a layer covering the visible part of the window (integer device px)
  const lx = Math.max(0, Math.floor(win.x * scale));
  const ly = Math.max(0, Math.floor(win.y * scale));
  const lw = Math.min(deviceW, Math.ceil((win.x + win.width) * scale)) - lx;
  const lh = Math.min(deviceH, Math.ceil((win.y + win.height) * scale)) - ly;
  if (lw > 0 && lh > 0) {
    const layer = (res.createCanvas ?? defaultCreateCanvas)(lw, lh);
    const l = layer.getContext('2d') as Ctx2D;
    l.setTransform(scale, 0, 0, scale, -lx, -ly);
    l.imageSmoothingEnabled = true;
    l.imageSmoothingQuality = 'high';

    // Title bar glass, part 1: the background behind the window, blurred (the content covers most of it).
    if (titleBar && settings.background.kind !== 'transparent') {
      const blur = settings.blur + CHROME.titleBarBlur * unit;
      l.save();
      l.filter = `blur(${blur * scale}px)`;
      paintBackground(l, settings.background, full, 0, res.backgroundImage, 0);
      l.restore();
    }

    if (source) {
      l.fillStyle = COLORS.windowBase[theme];
      l.fillRect(content.x, content.y, content.width, content.height);
      const crop = layout.sourceCrop;
      l.drawImage(source, crop.x, crop.y, crop.width, crop.height, content.x, content.y, content.width, content.height);
    }

    if (titleBar) {
      // Title bar glass, part 2: translucent chrome, separator, lights and text.
      l.fillStyle = COLORS.chrome[theme];
      l.fillRect(titleBar.x, titleBar.y, titleBar.width, titleBar.height);
      l.fillStyle = COLORS.separator[theme];
      l.fillRect(titleBar.x, titleBar.y + titleBar.height - unit, titleBar.width, unit);
      drawTitleBarContent(l, titleBar, unit, settings, res);
    }

    // Mask the layer to the rounded window; with no source, also punch out the content area for the template.
    l.globalCompositeOperation = 'destination-in';
    l.beginPath();
    roundRectPath(l, win, radius);
    l.fillStyle = '#000';
    l.fill();
    if (!source) {
      l.globalCompositeOperation = 'destination-out';
      l.beginPath();
      contentPath(l, content, radius, !!titleBar);
      l.fill();
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!source) {
      // Template: the shadow under the content area must go too, so the page shows through unchanged.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.beginPath();
      contentPath(ctx, content, radius, !!titleBar);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.drawImage(layer, lx, ly);
    ctx.restore();
  }

  // window border
  if (settings.window.style !== 'none') {
    ctx.beginPath();
    const inset = unit / 2;
    roundRectPath(
      ctx,
      { x: win.x + inset, y: win.y + inset, width: win.width - unit, height: win.height - unit },
      Math.max(0, radius - inset),
    );
    ctx.strokeStyle = COLORS.border[theme];
    ctx.lineWidth = unit;
    ctx.stroke();
  }

  ctx.restore();
  return { contentRect: content, contentRadius: radius, layout };
}
