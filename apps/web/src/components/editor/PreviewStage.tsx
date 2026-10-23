'use client';

import { renderFrame, resolveCanvasSize } from '@weshot/frame';
import { ERROR_ACTIONS, isErrorCode } from '@weshot/shared';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getDemoBitmap } from '@/lib/demo-source';
import { sourceTitle, sourceUrl, useEditor } from '@/lib/store';
import { cx } from '../ui/cx';
import { StatusPill } from './StatusPill';
import { usePreviewDescription } from './usePreviewDescription';
import { ErrorActions } from './ErrorActions';

const STEP_LABEL = { loading: 'Loading page', fonts: 'Waiting for fonts', framing: 'Framing' } as const;
const MAX_BACKING = 4096;

type Props = {
  /** Desktop: min 520, grows with the canvas aspect. Mobile: fixed 290. */
  variant: 'desktop' | 'mobile';
  className?: string;
};

/**
 * Live preview: the same renderFrame as the export, drawn at the displayed size × devicePixelRatio.
 */
export function PreviewStage({ variant, className }: Props) {
  const frame = useEditor((s) => s.frame);
  const source = useEditor((s) => s.source);
  const sourceVersion = useEditor((s) => s.sourceVersion);
  const bgImage = useEditor((s) => s.backgroundImage);
  const phase = useEditor((s) => s.phase);
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const setFitZoom = useEditor((s) => s.setFitZoom);
  const recording = useEditor((s) => s.recording);
  const description = usePreviewDescription();

  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [contentBox, setContentBox] = useState<{ x: number; y: number; width: number; height: number; radius: number } | null>(null);

  // Demo bitmap for the first-visit state.
  useEffect(() => {
    if (source.kind === 'demo' && !source.bitmap) {
      void getDemoBitmap().then((bitmap) => {
        const s = useEditor.getState();
        if (s.source.kind === 'demo' && !s.source.bitmap) useEditor.setState({ source: { kind: 'demo', bitmap } });
      });
    }
  }, [source]);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const capturing = phase.kind === 'capturing';
  const bitmap = capturing ? null : source.bitmap;
  const srcSize = bitmap ? { width: bitmap.width, height: bitmap.height } : null;
  const out = resolveCanvasSize(frame, srcSize);
  const aspect = out.height / out.width;

  const pad = variant === 'desktop' ? 24 : 12;
  const stageHeight = variant === 'desktop' ? Math.min(720, Math.max(520, box.width * aspect + pad * 2)) : 290;
  const fit = box.width > 0 ? Math.min((box.width - pad * 2) / out.width, (stageHeight - pad * 2) / out.height) : 0;
  const z = zoom ?? fit;

  useEffect(() => {
    if (fit > 0) setFitZoom(fit);
  }, [fit, setFitZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || z <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let scale = z * dpr;
    scale = Math.min(scale, MAX_BACKING / Math.max(out.width, out.height));
    const raf = requestAnimationFrame(() => {
      canvas.width = Math.round(out.width * scale);
      canvas.height = Math.round(out.height * scale);
      // Same rasterizer as the export worker (CPU), so preview and download match pixel for pixel.
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      const res = renderFrame(ctx, bitmap, frame, { ...out, scale }, {
        backgroundImage: frame.background.kind === 'image' ? bgImage : null,
        url: sourceUrl(source),
        title: sourceTitle(source),
      });
      setContentBox({ ...res.contentRect, radius: res.contentRadius });
    });
    return () => cancelAnimationFrame(raf);
  }, [bitmap, frame, bgImage, z, out.width, out.height, source]);

  // Pinch to zoom (mobile).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStart.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom: z };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const next = Math.min(2, Math.max(fit, (pinchStart.current.zoom * d) / pinchStart.current.dist));
      setZoom(Math.abs(next - fit) < 0.01 ? null : next);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const cssW = out.width * z;
  const cssH = out.height * z;
  const zoomed = zoom !== null && zoom > fit + 0.001;

  return (
    <div
      ref={wrap}
      className={cx('relative w-full overflow-hidden', variant === 'desktop' ? 'rounded-[16px]' : 'rounded-[22px] border border-ws-line-1', className)}
      style={{ height: stageHeight, background: 'rgba(0,0,0,0.25)', touchAction: variant === 'mobile' ? 'pan-y' : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className={cx('absolute inset-0', zoomed ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden')}>
        <div
          key={sourceVersion}
          className={cx('relative shrink-0', !capturing && 'ws-frame-in', zoomed && 'm-auto')}
          style={{ width: cssW, height: cssH, margin: zoomed ? pad : undefined }}
        >
          <canvas ref={canvasRef} role="img" aria-label={description} style={{ width: cssW, height: cssH, display: 'block' }} />
          {capturing && contentBox ? (
            <div
              aria-hidden="true"
              className="ws-shimmer absolute"
              style={{
                left: contentBox.x * z,
                top: contentBox.y * z,
                width: contentBox.width * z,
                height: contentBox.height * z,
                borderBottomLeftRadius: contentBox.radius * z,
                borderBottomRightRadius: contentBox.radius * z,
              }}
            />
          ) : null}
        </div>
      </div>
      {capturing ? <StatusPill tone="capturing" label={STEP_LABEL[phase.step]} /> : null}
      {phase.kind === 'error' && isErrorCode(phase.code) && ERROR_ACTIONS[phase.code].length > 0 && phase.code !== 'INVALID_URL' ? (
        <div className="glass-pill-status absolute bottom-[22px] left-1/2 z-10 flex w-max max-w-[calc(100%-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-[20px] border-ws-yellow-line px-4 py-3 text-[14px]">
          <span>{phase.message}</span>
          <ErrorActions code={phase.code} />
        </div>
      ) : null}
      {recording.kind === 'recording' ? <RecordingPill /> : null}
    </div>
  );
}

function RecordingPill() {
  const recording = useEditor((s) => s.recording);
  if (recording.kind !== 'recording') return null;
  return (
    <StatusPill
      tone="recording"
      label={recording.status}
      progress={recording.progress}
      time={`${recording.elapsedSec.toFixed(1)} s / ${recording.totalSec} s`}
      onStop={() => window.dispatchEvent(new CustomEvent('weshot:stop-recording'))}
    />
  );
}
