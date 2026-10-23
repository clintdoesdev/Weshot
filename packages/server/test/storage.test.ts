import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalStorage, assertKey } from '../src';

describe('storage keys', () => {
  it('accepts only known prefixes and no traversal', () => {
    expect(() => assertKey('captures/2026-10-23/abc.png')).not.toThrow();
    expect(() => assertKey('shares/2026-10-23/abc.webm')).not.toThrow();
    expect(() => assertKey('../etc/passwd')).toThrow();
    expect(() => assertKey('captures/../../x')).toThrow();
    expect(() => assertKey('other/x.png')).toThrow();
  });
});

describe('LocalStorage', () => {
  it('signs uploads and rejects tampering or expiry', async () => {
    const s = new LocalStorage(mkdtempSync(join(tmpdir(), 'ws-')), 'secret');
    const { url } = await s.presignPut('shares/2026-10-23/a.png', 'image/png', 1000);
    const q = new URL(url, 'http://x').searchParams;
    const exp = Number(q.get('exp'));
    const sig = q.get('sig')!;
    expect(s.verify('shares/2026-10-23/a.png', 'image/png', 1000, exp, sig)).toBe(true);
    expect(s.verify('shares/2026-10-23/b.png', 'image/png', 1000, exp, sig)).toBe(false);
    expect(s.verify('shares/2026-10-23/a.png', 'image/png', 9999, exp, sig)).toBe(false);
    expect(s.verify('shares/2026-10-23/a.png', 'image/png', 1000, 1, s.sign('shares/2026-10-23/a.png', 'image/png', 1000, 1))).toBe(false);
    await s.put('shares/2026-10-23/a.png', new Uint8Array([1, 2, 3]), 'image/png');
    expect(await s.size('shares/2026-10-23/a.png')).toBe(3);
    expect((await s.read('shares/2026-10-23/a.png'))?.contentType).toBe('image/png');
    await s.delete('shares/2026-10-23/a.png');
    expect(await s.size('shares/2026-10-23/a.png')).toBeNull();
  });
});
