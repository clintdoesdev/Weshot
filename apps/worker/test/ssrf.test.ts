import http from 'node:http';
import net from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startSafeProxy, type SafeProxy } from '../src/proxy';
import { assertPublicUrl, isBlockedAddress, resolvePublic } from '../src/ssrf';
import { startTestSite, testPolicy, testResolver, type TestSite } from './server';

describe('isBlockedAddress', () => {
  it.each([
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.254',
    '192.168.0.1',
    '127.0.0.1',
    '127.1.2.3',
    '169.254.169.254',
    '169.254.0.1',
    '0.0.0.0',
    '100.64.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fc00::1',
    'fd12:3456:789a::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '::ffff:169.254.169.254',
    '64:ff9b::a00:1', // NAT64 for 10.0.0.1
    '2002:7f00:1::1', // 6to4 for 127.0.0.1
    'ff02::1',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.255.255', '172.32.0.1', '2606:4700:4700::1111', '2001:4860:4860::8888'])(
    'allows public %s',
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    },
  );
});

describe('assertPublicUrl', () => {
  const resolver = testResolver();
  it.each(['file:///etc/passwd', 'ftp://example.com/', 'gopher://example.com/', 'data:text/html,hi', 'javascript:alert(1)', 'chrome://settings', 'ws://example.com/'])(
    'rejects non-http scheme %s',
    async (url) => {
      await expect(assertPublicUrl(url, resolver)).rejects.toMatchObject({ code: 'BLOCKED_HOST' });
    },
  );

  it.each([
    'http://127.0.0.1/',
    'http://localhost:3000/',
    'http://app.localhost/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://0x7f000001/', // hex form of 127.0.0.1, normalised by the URL parser
    'http://2130706433/', // decimal form of 127.0.0.1
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/',
    'http://[fd00::1]/',
    'http://internal.test/',
    'http://metadata.test/',
    'http://v6.test/',
    'http://mixed.test/', // one public and one private address
    'http://printer.local/',
  ])('rejects private or local %s', async (url) => {
    await expect(assertPublicUrl(url, resolver)).rejects.toMatchObject({ code: 'BLOCKED_HOST' });
  });

  it('rejects internal-service ports on public hosts', async () => {
    await expect(assertPublicUrl('http://public.test:6379/', resolver, testPolicy)).rejects.toMatchObject({ code: 'BLOCKED_HOST' });
  });

  it('reports unresolvable hosts as invalid', async () => {
    await expect(assertPublicUrl('https://no-such-host.test/', resolver)).rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('accepts public hosts', async () => {
    await expect(assertPublicUrl('https://public.test/', resolver, testPolicy)).resolves.toBeInstanceOf(URL);
    await expect(resolvePublic('public.test', resolver, testPolicy)).resolves.toBe('127.0.0.2');
  });
});

describe('SafeProxy', () => {
  let site: TestSite;
  let rebindCalls = 0;
  let proxy: SafeProxy;
  beforeAll(async () => {
    site = await startTestSite();
    proxy = await startSafeProxy({
      resolver: testResolver({
        // DNS rebinding: public on the first lookup, loopback afterwards.
        'rebind.test': () => (rebindCalls++ === 0 ? ['127.0.0.2'] : ['127.0.0.1']),
      }),
      allowed: testPolicy,
    });
  });
  afterAll(async () => {
    await proxy.close();
    await site.close();
  });

  const viaProxy = (url: string) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: proxy.port, method: 'GET', path: url, headers: { host: new URL(url).host } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      });
      req.on('error', reject);
      req.end();
    });

  const connect = (authority: string) =>
    new Promise<string>((resolve) => {
      const s = net.connect(proxy.port, '127.0.0.1', () => s.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`));
      s.once('data', (d) => {
        resolve(d.toString().split('\r\n')[0]!);
        s.destroy();
      });
    });

  it('relays public hosts', async () => {
    const r = await viaProxy(`http://public.test:${site.port}/`);
    expect(r.status).toBe(200);
    expect(r.body).toContain('Public page');
  });

  it('refuses private, loopback, metadata and IPv6 loopback targets', async () => {
    for (const host of ['internal.test', 'loopback.test', 'metadata.test', 'v6.test', '127.0.0.1', '[::1]', 'localhost']) {
      const r = await viaProxy(`http://${host}:${site.port}/secret`);
      expect(r.status, host).toBe(403);
      expect(r.body).not.toContain('secret');
    }
  });

  it('refuses CONNECT tunnels to private targets', async () => {
    expect(await connect(`loopback.test:${site.port}`)).toContain('403');
    expect(await connect(`127.0.0.1:${site.port}`)).toContain('403');
    expect(await connect(`[::1]:${site.port}`)).toContain('403');
    expect(await connect(`public.test:${site.port}`)).toContain('200');
  });

  it('defeats DNS rebinding: the pre-check passes, the connection is re-validated and refused', async () => {
    rebindCalls = 0;
    await expect(assertPublicUrl(`http://rebind.test:${site.port}/secret`, testResolver({ 'rebind.test': ['127.0.0.2'] }), testPolicy)).resolves.toBeDefined();
    rebindCalls = 1; // the attacker's DNS now answers with loopback
    const r = await viaProxy(`http://rebind.test:${site.port}/secret`);
    expect(r.status).toBe(403);
    expect(site.hits.filter((h) => h.startsWith('rebind.test') && h.endsWith('/secret'))).toHaveLength(0);
  });
});
