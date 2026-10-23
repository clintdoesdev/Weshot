import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_BACKGROUNDS,
  BUILT_IN_PRESETS,
  GALLERY_EXAMPLES,
  captureSettingsSchema,
  displayUrl,
  errorMessage,
  frameSettingsSchema,
  looksLikeUrl,
  normalizeUrl,
  presetFileSchema,
  recordSettingsSchema,
  DEFAULT_RECORD,
} from '../src';

describe('normalizeUrl', () => {
  it('adds https:// to bare hosts', () => {
    expect(normalizeUrl('queuely.app')).toBe('https://queuely.app/');
    expect(normalizeUrl('  www.example.com/pricing ')).toBe('https://www.example.com/pricing');
  });
  it('keeps http and https', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });
  it('rejects non-http schemes and junk', () => {
    expect(normalizeUrl('ftp://example.com')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('file:///etc/passwd')).toBeNull();
    expect(normalizeUrl('hello world')).toBeNull();
    expect(normalizeUrl('notaurl')).toBeNull();
    expect(normalizeUrl('https://user:pass@example.com')).toBeNull();
  });
  it('accepts host:port without scheme', () => {
    expect(normalizeUrl('example.com:8080/x')).toBe('https://example.com:8080/x');
  });
});

describe('looksLikeUrl', () => {
  it('detects links in pasted text', () => {
    expect(looksLikeUrl('queuely.app')).toBe(true);
    expect(looksLikeUrl('https://a.b.co/x?y=1')).toBe(true);
    expect(looksLikeUrl('just some words')).toBe(false);
    expect(looksLikeUrl('v1.2')).toBe(false);
  });
});

describe('displayUrl', () => {
  it('strips scheme and www', () => {
    expect(displayUrl('https://www.queuely.app/')).toBe('queuely.app');
    expect(displayUrl('https://queuely.app/docs/')).toBe('queuely.app/docs');
  });
});

describe('schemas', () => {
  it('all built-in presets and gallery examples are valid frame settings', () => {
    for (const p of [...BUILT_IN_PRESETS, ...GALLERY_EXAMPLES]) {
      expect(() => frameSettingsSchema.parse(p.frame)).not.toThrow();
    }
  });
  it('has 6 backgrounds in spec order', () => {
    expect(BUILT_IN_BACKGROUNDS.map((b) => b.id)).toEqual(['honey', 'midnight', 'lemon', 'graphite', 'black', 'paper']);
  });
  it('validates capture bounds', () => {
    const base = {
      url: 'https://example.com/',
      viewport: { width: 1440, height: 900 },
      scale: 2,
      fullPage: false,
      colorScheme: 'auto',
      delayMs: 0,
      hideBanners: true,
    };
    expect(captureSettingsSchema.safeParse(base).success).toBe(true);
    expect(captureSettingsSchema.safeParse({ ...base, viewport: { width: 100, height: 900 } }).success).toBe(false);
    expect(captureSettingsSchema.safeParse({ ...base, delayMs: 20000 }).success).toBe(false);
    expect(captureSettingsSchema.safeParse({ ...base, scale: 4 }).success).toBe(false);
  });
  it('limits GIF length to 15 s', () => {
    expect(recordSettingsSchema.safeParse({ ...DEFAULT_RECORD, format: 'gif', lengthSec: 20 }).success).toBe(false);
    expect(recordSettingsSchema.safeParse({ ...DEFAULT_RECORD, format: 'gif', lengthSec: 15 }).success).toBe(true);
  });
  it('round-trips a preset file', () => {
    const file = { app: 'weshot', version: 1, presets: [{ id: 'a', name: 'Mine', frame: BUILT_IN_PRESETS[0]!.frame }] };
    expect(presetFileSchema.parse(JSON.parse(JSON.stringify(file)))).toEqual(file);
  });
});

describe('errorMessage', () => {
  it('formats params', () => {
    expect(errorMessage('HTTP_5XX', { status: 503 })).toBe('The site returned an error (503).');
    expect(errorMessage('RATE_LIMIT', { minutes: 12 })).toBe("You've made a lot of captures this hour. Try again in 12 min.");
  });
});
