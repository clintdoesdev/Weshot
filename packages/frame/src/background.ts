import { getBackground, type BackgroundLayer, type BackgroundSetting } from '@weshot/shared';
import { coverCrop, cssLinearGradientPoints, farthestCorner } from './geometry';
import type { Ctx2D, FrameSource, Rect } from './types';

function paintLayer(ctx: Ctx2D, layer: BackgroundLayer, area: Rect, ref: Rect): void {
  if (layer.type === 'solid') {
    ctx.fillStyle = layer.color;
  } else if (layer.type === 'linear') {
    const p = cssLinearGradientPoints(layer.angle, ref);
    const g = ctx.createLinearGradient(p.x0, p.y0, p.x1, p.y1);
    for (const s of layer.stops) g.addColorStop(s.offset, s.color);
    ctx.fillStyle = g;
  } else {
    const cx = ref.x + ref.width * layer.cx;
    const cy = ref.y + ref.height * layer.cy;
    const r = farthestCorner(cx, cy, ref);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const s of layer.stops) g.addColorStop(s.offset, s.color);
    ctx.fillStyle = g;
  }
  ctx.fillRect(area.x, area.y, area.width, area.height);
}

export function backgroundLayers(bg: BackgroundSetting): BackgroundLayer[] {
  switch (bg.kind) {
    case 'preset':
      return getBackground(bg.id).layers;
    case 'solid':
      return [{ type: 'solid', color: bg.color }];
    case 'gradient':
      return [
        {
          type: 'linear',
          angle: bg.angle,
          stops: [
            { offset: 0, color: bg.from },
            { offset: 1, color: bg.to },
          ],
        },
      ];
    default:
      return [];
  }
}

/**
 * Paints the background over `ref` (the full canvas, in 1x units).
 * With blur, the paint area is grown so edges do not fade to transparent.
 * `blurPx` is in device px (already multiplied by the output scale).
 */
export function paintBackground(
  ctx: Ctx2D,
  bg: BackgroundSetting,
  ref: Rect,
  blurPx: number,
  image: FrameSource | null | undefined,
  blurUnits: number,
): void {
  if (bg.kind === 'transparent') return;
  ctx.save();
  if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
  const grow = blurPx > 0 ? blurUnits * 2 : 0;
  const area = { x: ref.x - grow, y: ref.y - grow, width: ref.width + grow * 2, height: ref.height + grow * 2 };
  if (bg.kind === 'image') {
    if (image && image.width > 0 && image.height > 0) {
      const crop = coverCrop(image.width, image.height, area);
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, area.x, area.y, area.width, area.height);
    } else {
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(area.x, area.y, area.width, area.height);
    }
  } else {
    for (const layer of backgroundLayers(bg)) paintLayer(ctx, layer, area, ref);
  }
  ctx.restore();
}

/** CSS `background` value for a setting; used by swatches and the preview stage. */
export function backgroundCss(bg: BackgroundSetting): string {
  switch (bg.kind) {
    case 'preset':
      return getBackground(bg.id).css;
    case 'solid':
      return bg.color;
    case 'gradient':
      return `linear-gradient(${bg.angle}deg, ${bg.from} 0%, ${bg.to} 100%)`;
    case 'image':
      return `center / cover no-repeat url("${bg.src.replace(/"/g, '%22')}")`;
    case 'transparent':
      return 'repeating-conic-gradient(#2A2A2C 0% 25%, #1C1C1E 0% 50%) 0 0 / 16px 16px';
  }
}
