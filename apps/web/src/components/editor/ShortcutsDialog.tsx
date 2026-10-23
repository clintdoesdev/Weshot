'use client';

import { useEditor } from '@/lib/store';
import { Dialog } from '../ui/Dialog';

const SHORTCUTS: Array<[string, string]> = [
  ['Cmd/Ctrl + V (anywhere)', 'Paste a link or image'],
  ['Enter (in bar)', 'Frame it'],
  ['Cmd/Ctrl + C (focus not in a field)', 'Copy image'],
  ['Cmd/Ctrl + S', 'Download with current settings'],
  ['R', 'Re-capture'],
  ['1–6', 'Switch editor tab'],
  ['Shift + /', 'Shortcuts dialog'],
];

/** UI spec §6. */
export function ShortcutsDialog() {
  const open = useEditor((s) => s.shortcutsOpen);
  const setOpen = useEditor((s) => s.setShortcutsOpen);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <dl className="flex flex-col">
        {SHORTCUTS.map(([keys, action]) => (
          <div key={keys} className="flex items-center justify-between gap-4 border-t border-white/10 py-3 first:border-t-0">
            <dt className="text-[14px] text-ws-text-2">{action}</dt>
            <dd className="text-right font-mono text-[13px] text-white">{keys}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
