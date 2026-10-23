import { AUTO_CANVAS_MAX_CONTENT_WIDTH, getSizePreset, type FrameSettings } from '@weshot/shared';
import { CHROME, DEFAULT_SOURCE_SIZE, TALL_SOURCE_ASPECT } from './constants';
import { clamp } from './geometry';
import type { FrameLayout, Size } from './types';

const MIN_UNIT = 0.5;
const MAX_UNIT = 4;

function unitFor(windowWidth: number): number {
  return clamp(windowWidth / CHROME.referenceWidth, MIN_UNIT, MAX_UNIT);
}

export function titleBarHeight(settings: FrameSettings, unit: number): number {
  return CHROME.titleBar[settings.window.style] * unit;
}

/** The output size for these settings and source, in canvas px at 1x. */
export function resolveCanvasSize(settings: FrameSettings, source: Size | null): Size {
  const { canvas } = settings;
  if (canvas === 'auto') {
    const src = source ?? DEFAULT_SOURCE_SIZE;
    const contentW = Math.min(src.width, AUTO_CANVAS_MAX_CONTENT_WIDTH);
    const contentH = (src.height * contentW) / src.width;
    const titleH = CHROME.titleBar[settings.window.style] * unitFor(contentW);
    return {
      width: Math.round(contentW + settings.padding * 2),
      height: Math.round(contentH + titleH + settings.padding * 2),
    };
  }
  if (typeof canvas === 'string') {
    const p = getSizePreset(canvas);
    return { width: p.width, height: p.height };
  }
  return { width: canvas.width, height: canvas.height };
}

/**
 * Where everything goes. Pure geometry, shared by the renderer, the preview hit-testing and the video template.
 * `canvasSize` is the output size; pass `resolveCanvasSize(...)` unless rendering at a forced size.
 */
export function computeLayout(settings: FrameSettings, source: Size | null, canvasSize: Size): FrameLayout {
  const src = source ?? DEFAULT_SOURCE_SIZE;
  const T = CHROME.titleBar[settings.window.style];
  const aspect = src.height / src.width;
  const pad = settings.padding;
  const availW = Math.max(1, canvasSize.width - pad * 2);
  const availH = Math.max(1, canvasSize.height - pad * 2);

  let contentW: number;
  let contentH: number;
  let unit: number;
  let crop = { x: 0, y: 0, width: src.width, height: src.height };

  if (settings.canvas === 'auto') {
    contentW = availW;
    unit = unitFor(contentW);
    contentH = Math.max(1, availH - T * unit);
  } else if (aspect > TALL_SOURCE_ASPECT) {
    // Full-page capture in a fixed canvas: fill the area and show the top of the page.
    contentW = availW;
    unit = unitFor(contentW);
    contentH = Math.max(1, availH - T * unit);
    crop = { x: 0, y: 0, width: src.width, height: Math.min(src.height, (src.width * contentH) / contentW) };
  } else {
    // Contain: window height = w * aspect + T * w / ref, linear in w.
    contentW = Math.min(availW, availH / (aspect + T / CHROME.referenceWidth));
    unit = unitFor(contentW);
    if (contentW * aspect + T * unit > availH) contentW = Math.max(1, (availH - T * unit) / aspect);
    contentH = contentW * aspect;
  }

  const s = settings.windowScale;
  const winW = contentW * s;
  unit *= s;
  const titleH = T * unit;
  const winH = contentH * s + titleH;
  const cx = canvasSize.width / 2 + settings.windowOffset.x;
  const cy = canvasSize.height / 2 + settings.windowOffset.y;
  const window = { x: cx - winW / 2, y: cy - winH / 2, width: winW, height: winH };
  const titleBar = T > 0 ? { x: window.x, y: window.y, width: winW, height: titleH } : null;
  const content = { x: window.x, y: window.y + titleH, width: winW, height: winH - titleH };

  return {
    canvas: canvasSize,
    unit,
    window,
    radius: Math.min(settings.window.radius * unit, winW / 2, winH / 2),
    titleBar,
    content,
    sourceCrop: crop,
  };
}
