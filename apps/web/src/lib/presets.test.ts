import { BUILT_IN_PRESETS } from '@weshot/shared';
import { describe, expect, it } from 'vitest';
import { exportPresetFile, importPresetFile, sameFrame } from './presets';

describe('preset files', () => {
  it('round-trips and gives imported presets fresh ids', async () => {
    const presets = [{ id: 'a', name: 'Mine', frame: BUILT_IN_PRESETS[1]!.frame }];
    const imported = await importPresetFile(exportPresetFile(presets));
    expect(imported).toHaveLength(1);
    expect(imported[0]!.id).not.toBe('a');
    expect(sameFrame(imported[0]!.frame, presets[0]!.frame)).toBe(true);
  });
  it('rejects files that are not WeShot presets', async () => {
    await expect(importPresetFile(new Blob(['{"presets":[]}']))).rejects.toThrow();
  });
});
