'use client';

import { useEditor } from '@/lib/store';

export function ZoomControls() {
  const zoom = useEditor((s) => s.zoom);
  const fit = useEditor((s) => s.fitZoom);
  const setZoom = useEditor((s) => s.setZoom);
  const z = zoom ?? fit;
  const pct = Math.round(z * 100);
  const min = Math.max(5, Math.floor(fit * 100 * 0.5));
  const max = 200;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setZoom(null)}
        aria-pressed={zoom === null}
        className="btn-secondary h-9 rounded-pill px-[14px] text-[14px]"
      >
        Fit
      </button>
      <input
        type="range"
        aria-label="Zoom"
        aria-valuetext={`${pct}%`}
        min={min}
        max={max}
        value={Math.min(max, Math.max(min, pct))}
        onChange={(e) => {
          const v = Number(e.target.value) / 100;
          setZoom(Math.abs(v - fit) < 0.005 ? null : v);
        }}
        className="ws-range w-[120px]"
        style={{ '--fill': `${((Math.min(max, Math.max(min, pct)) - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
      <span className="w-[44px] text-right font-mono text-[13px] text-ws-text-2" aria-hidden="true">
        {pct}%
      </span>
    </div>
  );
}
