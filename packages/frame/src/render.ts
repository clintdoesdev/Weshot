import type { FrameSettings } from '@weshot/shared';
import { paintBackground } from './background';
import { drawTitleBarContent } from './chrome';
import { CHROME, COLORS, DEFAULT_FONT_FAMILY, SHADOWS } from './constants';
import { roundRectPath } from './geometry';
import { applyGrain } from './grain';
import { computeLayout } from './layout';
import type { Ctx2D, FrameOutput, FrameResources, FrameSource, Rect, RenderResult } from './types';

function sourceSize(source: FrameSource): { width: number; height: number } {
  // HTMLImageElement reports its layout size in width/height; the pixel size is in naturalWidth/Height.
  const img = source as { naturalWidth?: number; naturalHeight?: number };
  if (img.naturalWidth && img.naturalHeight) return { width: img.naturalWidth, height: img.naturalHeight };
  return { width: source.width, height: source.height };
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

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, Math.round(output.width * scale), Math.round(output.height * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. background
  paintBackground(ctx, settings.background, full, settings.blur * scale, res.backgroundImage, settings.blur);

  // 2. grain (device px, deterministic)
  if (settings.grain > 0 && settings.background.kind !== 'transparent') {
    applyGrain(ctx, 0, 0, Math.round(output.width * scale), Math.round(output.height * scale), settings.grain);
  }

  // 3. shadow
  if (settings.shadow !== 'none') drawShadow(ctx, win, radius, unit, scale, settings.shadow);

  // 4. window body
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, win, radius);
  ctx.clip();

  if (source) {
    ctx.fillStyle = COLORS.windowBase[theme];
    ctx.fillRect(content.x, content.y, content.width, content.height);
  }

  // 5. title bar: blurred background behind it, then translucent chrome
  if (titleBar) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(titleBar.x, titleBar.y, titleBar.width, titleBar.height);
    ctx.clip();
    const blur = CHROME.titleBarBlur * unit;
    paintBackground(ctx, settings.background, full, (settings.blur + blur) * scale, res.backgroundImage, settings.blur + blur);
    ctx.fillStyle = COLORS.chrome[theme];
    ctx.fillRect(titleBar.x, titleBar.y, titleBar.width, titleBar.height);
    ctx.fillStyle = COLORS.separator[theme];
    ctx.fillRect(titleBar.x, titleBar.y + titleBar.height - unit, titleBar.width, unit);
    // 6–7. traffic lights and title bar text
    drawTitleBarContent(ctx, titleBar, unit, settings, res);
    ctx.restore();
  }

  // 8. page image
  if (source) {
    const crop = layout.sourceCrop;
    ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, content.x, content.y, content.width, content.height);
  }
  ctx.restore();

  if (!source) {
    // Template: punch the content area so the worker can lay page frames underneath.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    contentPath(ctx, content, radius, !!titleBar);
    ctx.fillStyle = '#000';
    ctx.fill();
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
