import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { defaultPolicy, type AddressPolicy, type Resolver } from '../src/ssrf';

/**
 * A local site for SSRF tests. It listens on all interfaces; tests treat 127.0.0.2 as a "public" address
 * and keep every other loopback address blocked, so the real policy runs end to end.
 */
export const PUBLIC_TEST_IP = '127.0.0.2';
export const testPolicy: AddressPolicy = (a) => a === PUBLIC_TEST_IP || defaultPolicy(a);

export function testResolver(extra: Record<string, string[] | (() => string[])> = {}): Resolver {
  const table: Record<string, string[] | (() => string[])> = {
    'public.test': [PUBLIC_TEST_IP],
    'internal.test': ['10.0.0.5'],
    'loopback.test': ['127.0.0.1'],
    'metadata.test': ['169.254.169.254'],
    'v6.test': ['::1'],
    'mixed.test': [PUBLIC_TEST_IP, '192.168.1.10'],
    ...extra,
  };
  return async (host) => {
    const v = table[host];
    if (!v) throw new Error('ENOTFOUND');
    return typeof v === 'function' ? v() : v;
  };
}

export type TestSite = { port: number; hits: string[]; close: () => Promise<void> };

export function startTestSite(): Promise<TestSite> {
  const hits: string[] = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    hits.push(`${req.headers.host}${url.pathname}`);
    const port = (server.address() as AddressInfo).port;
    if (url.pathname === '/secret') {
      res.writeHead(200, { 'content-type': 'text/html' }).end('<title>SECRET</title><h1>internal secret</h1>');
    } else if (url.pathname === '/redirect') {
      res.writeHead(302, { location: url.searchParams.get('to')!.replace('{port}', String(port)) }).end();
    } else if (url.pathname.startsWith('/loop/')) {
      const n = Number(url.pathname.split('/')[2]);
      res.writeHead(302, { location: `/loop/${n + 1}` }).end();
    } else if (url.pathname === '/missing') {
      res.writeHead(404, { 'content-type': 'text/html' }).end('<title>Not found</title>');
    } else if (url.pathname === '/broken') {
      res.writeHead(503, { 'content-type': 'text/html' }).end('<title>Down</title>');
    } else if (url.pathname === '/challenge') {
      res.writeHead(403, { 'content-type': 'text/html', 'cf-mitigated': 'challenge' }).end('<title>Just a moment...</title>');
    } else if (url.pathname === '/tall') {
      res.writeHead(200, { 'content-type': 'text/html' }).end(
        `<title>Tall</title><body style="margin:0"><div style="height:20000px;background:linear-gradient(#fff,#000)"></div></body>`,
      );
    } else if (url.pathname === '/img-private') {
      res.writeHead(200, { 'content-type': 'text/html' }).end(
        `<title>Page</title><img src="http://loopback.test:${port}/secret"><img src="http://127.0.0.1:${port}/secret">`,
      );
    } else {
      res
        .writeHead(200, { 'content-type': 'text/html' })
        .end(`<title>Public page</title><body style="margin:0;background:#3355ff"><h1 style="color:#fff">Hello</h1></body>`);
    }
  });
  return new Promise((resolve) =>
    server.listen(0, '0.0.0.0', () =>
      resolve({
        port: (server.address() as AddressInfo).port,
        hits,
        close: () => new Promise((r) => server.close(() => r())),
      }),
    ),
  );
}
