'use client';

import { Ellipsis, Plus } from 'lucide-react';
import { BUILT_IN_PRESETS, type FramePreset } from '@weshot/shared';
import { useEffect, useRef, useState } from 'react';
import { saveBlob } from '@/lib/download';
import { exportPresetFile, importPresetFile, loadUserPresets, newPresetId, sameFrame, saveUserPresets } from '@/lib/presets';
import { useEditor } from '@/lib/store';
import { Chip } from '../ui/Chip';
import { cx } from '../ui/cx';
import { Menu } from '../ui/Menu';

/** Presets row: built-ins, the user's own (localStorage), Save current, and JSON export/import. */
export function PresetChips({ scroll = false, className }: { scroll?: boolean; className?: string }) {
  const frame = useEditor((s) => s.frame);
  const applyFrame = useEditor((s) => s.applyFrame);
  const showToast = useEditor((s) => s.showToast);
  const [userPresets, setUserPresets] = useState<FramePreset[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => setUserPresets(loadUserPresets()), []);
  useEffect(() => {
    if (naming) nameInput.current?.focus();
  }, [naming]);

  const persist = (next: FramePreset[]) => {
    setUserPresets(next);
    if (!saveUserPresets(next)) showToast("Couldn't save presets in this browser.");
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist([...userPresets, { id: newPresetId(), name: trimmed.slice(0, 60), frame: structuredClone(frame) }]);
    setName('');
    setNaming(false);
  };

  const selectedUser = userPresets.find((p) => sameFrame(p.frame, frame));

  return (
    <div className={cx('flex min-w-0 items-center gap-2', className)}>
      <span className="shrink-0 text-[14px] text-ws-text-3">Presets</span>
      <div className={cx('flex min-w-0 items-center gap-2', scroll ? 'no-scrollbar overflow-x-auto' : 'flex-wrap')}>
        {[...BUILT_IN_PRESETS, ...userPresets].map((p) => (
          <Chip key={p.id} selected={sameFrame(p.frame, frame)} onClick={() => applyFrame(p.frame)}>
            {p.name}
          </Chip>
        ))}
        {naming ? (
          <form
            className="flex shrink-0 items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              ref={nameInput}
              aria-label="Preset name"
              placeholder="Preset name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setNaming(false);
                }
              }}
              className="h-9 w-[150px] rounded-pill border border-ws-line-2 bg-black/25 px-3.5 text-[14px] text-white"
            />
            <button type="submit" className="btn-primary h-9 rounded-pill px-3.5 text-[14px]" disabled={!name.trim()}>
              Save
            </button>
          </form>
        ) : (
          <Chip dashed onClick={() => setNaming(true)}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            Save current
          </Chip>
        )}
        <Menu
          label="Preset options"
          align="start"
          triggerClassName="btn-secondary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          trigger={<Ellipsis size={16} strokeWidth={1.75} aria-hidden="true" />}
          items={[
            {
              id: 'export',
              label: 'Export presets',
              disabled: userPresets.length === 0,
              onSelect: () => saveBlob(exportPresetFile(userPresets), 'weshot-presets.json'),
            },
            { id: 'import', label: 'Import presets', onSelect: () => fileInput.current?.click() },
            ...(selectedUser
              ? [{ id: 'delete', label: `Delete ${selectedUser.name}`, onSelect: () => persist(userPresets.filter((p) => p.id !== selectedUser.id)) }]
              : []),
          ]}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Import presets file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const imported = await importPresetFile(f);
              persist([...userPresets, ...imported]);
              showToast(imported.length === 1 ? '1 preset imported' : `${imported.length} presets imported`);
            } catch {
              showToast("That file isn't a WeShot presets file.");
            }
          }}
        />
      </div>
    </div>
  );
}
