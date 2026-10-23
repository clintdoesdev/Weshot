'use client';

import { BUILT_IN_BACKGROUNDS } from '@weshot/shared';
import { useEditor } from '@/lib/store';
import { cx } from '../ui/cx';

/** Six built-in backgrounds, UI spec §2.8. 3×2 on desktop, one row of 6 on mobile. */
export function BackgroundSwatches({ columns = 3 }: { columns?: 3 | 6 }) {
  const bg = useEditor((s) => s.frame.background);
  const setBackground = useEditor((s) => s.setBackground);
  return (
    <div role="group" aria-label="Backgrounds" className={cx('grid gap-2.5', columns === 3 ? 'grid-cols-3' : 'grid-cols-6')}>
      {BUILT_IN_BACKGROUNDS.map((b) => {
        const selected = bg.kind === 'preset' && bg.id === b.id;
        return (
          <button
            key={b.id}
            type="button"
            aria-label={`Use ${b.name} background`}
            aria-pressed={selected}
            title={b.name}
            onClick={() => setBackground({ kind: 'preset', id: b.id })}
            className={cx(
              'h-11 rounded-[12px] border border-white/[0.18] transition-[outline-color] duration-150',
              selected && 'outline outline-2 outline-offset-2 outline-ws-yellow',
            )}
            style={{ background: b.css }}
          />
        );
      })}
    </div>
  );
}
