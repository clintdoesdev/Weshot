import type { CSSProperties } from 'react';

/** Ambient yellow glow behind glass (UI spec §1.3). Static and decorative. */
export function Glow({ style, className }: { style: CSSProperties; className?: string }) {
  return <div aria-hidden="true" className={`ws-glow ${className ?? ''}`} style={style} />;
}
