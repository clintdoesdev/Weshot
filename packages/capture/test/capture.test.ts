import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CAPTURE, type CaptureSettings } from '@weshot/shared';
import { capturePage } from '../src/capture';
import { startTestSite, testPolicy, testResolver, type TestSite } from './server';

/** End to end through real Chromium and the SSRF proxy (product spec §4.6). */
describe('capturePage', () => {
  let site: TestSite;
  let rebind = 0;
  const deps = () => ({
    resolver: testResolver({ 'rebind.test': () => (rebind++ === 0 ? ['127.0.0.2'] : ['127.0.0.1']) }),
    allowed: testPolicy,
    adblock: false,
  });
  const settings = (path: string, patch: Partial<CaptureSettings> = {}): CaptureSettings => ({
    ...DEFAULT_CAPTURE,
    scale: 1,
    viewport: { width: 800, height: 600 },
    url: `http://public.test:${site.port}${path}`,
    ...patch,
  });

  beforeAll(async () => {
    site = await startTestSite();
  });
  afterAll(async () => {
    await site.close();
  });

  it('captures a public page and reports progress', async () => {
    const statuses: string[] = [];
    const r = await capturePage(settings('/'), { ...deps(), onStatus: (s) => void statuses.push(s) });
    expect(r.image.subarray(1, 4).toString()).toBe('PNG');
    expect(r.image.readUInt32BE(16)).toBe(800);
    expect(r.image.readUInt32BE(20)).toBe(600);
    expect(r.title).toBe('Public page');
    expect(statuses).toEqual(['loading', 'fonts', 'capturing']);
  });

  it('applies the device scale', async () => {
    const r = await capturePage(settings('/', { scale: 2 }), deps());
    expect(r.image.readUInt32BE(16)).toBe(1600);
  });

  it('blocks a redirect to a private IP', async () => {
    const to = encodeURIComponent('http://127.0.0.1:{port}/secret');
    await expect(capturePage(settings(`/redirect?to=${to}`), deps())).rejects.toMatchObject({ code: 'BLOCKED_HOST' });
    expect(site.hits.some((h) => h.startsWith('127.0.0.1') && h.endsWith('/secret'))).toBe(false);
  });

  it('blocks a redirect to a host that resolves to a private IP', async () => {
    const to = encodeURIComponent('http://internal.test:{port}/secret');
    await expect(capturePage(settings(`/redirect?to=${to}`), deps())).rejects.toMatchObject({ code: 'BLOCKED_HOST' });
  });

  it('blocks a redirect to IPv6 loopback', async () => {
    const to = encodeURIComponent('http://[::1]:{port}/secret');
    await expect(capturePage(settings(`/redirect?to=${to}`), deps())).rejects.toMatchObject({ code: 'BLOCKED_HOST' });
  });

  it('blocks a redirect to a non-http scheme', async () => {
    const to = encodeURIComponent('file:///etc/passwd');
    await expect(capturePage(settings(`/redirect?to=${to}`), deps())).rejects.toBeTruthy();
  });

  it('defeats DNS rebinding between the check and the browser request', async () => {
    rebind = 0;
    const before = site.hits.length;
    await expect(capturePage({ ...settings('/secret'), url: `http://rebind.test:${site.port}/secret` }, deps())).rejects.toMatchObject({
      code: 'BLOCKED_HOST',
    });
    expect(site.hits.slice(before).filter((h) => h.endsWith('/secret'))).toHaveLength(0);
  });

  it('keeps subresources on private hosts out of the page', async () => {
    const before = site.hits.length;
    await capturePage(settings('/img-private'), deps());
    expect(site.hits.slice(before).filter((h) => h.endsWith('/secret'))).toHaveLength(0);
  });

  it('stops after 5 redirects', async () => {
    await expect(capturePage(settings('/loop/0'), deps())).rejects.toMatchObject({ code: 'HTTP_4XX', status: 310 });
  });

  it('maps HTTP errors and bot walls to the spec codes', async () => {
    await expect(capturePage(settings('/missing'), deps())).rejects.toMatchObject({ code: 'HTTP_4XX', status: 404 });
    await expect(capturePage(settings('/broken'), deps())).rejects.toMatchObject({ code: 'HTTP_5XX', status: 503 });
    await expect(capturePage(settings('/challenge'), deps())).rejects.toMatchObject({ code: 'BOT_CHECK' });
  });

  it('cuts full-page captures at 16,000 px and says so', async () => {
    const r = await capturePage(settings('/tall', { fullPage: true }), deps());
    expect(r.truncated).toBe(true);
    expect(r.image.readUInt32BE(20)).toBe(16_000);
  });
});
