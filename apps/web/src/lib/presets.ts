import { presetFileSchema, userPresetSchema, type FramePreset, type FrameSettings, type PresetFile } from '@weshot/shared';
import { z } from 'zod';

const KEY = 'weshot.presets.v1';

/** Presets live only in this browser (UI spec §5: "Your presets are saved in your browser"). */
export function loadUserPresets(): FramePreset[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = z.array(userPresetSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveUserPresets(presets: FramePreset[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(presets));
    return true;
  } catch {
    return false;
  }
}

export function newPresetId(): string {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function exportPresetFile(presets: FramePreset[]): Blob {
  const file: PresetFile = { app: 'weshot', version: 1, presets };
  return new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
}

/** Parse an imported JSON file. Imported presets get fresh ids so they never clash. */
export async function importPresetFile(file: Blob): Promise<FramePreset[]> {
  const parsed = presetFileSchema.parse(JSON.parse(await file.text()));
  return parsed.presets.map((p) => ({ ...p, id: newPresetId() }));
}

export function sameFrame(a: FrameSettings, b: FrameSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
