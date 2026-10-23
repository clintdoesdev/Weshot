import http from 'node:http';
import net from 'node:net';
import type { Duplex } from 'node:stream';
import { defaultPolicy, isAllowedPort, resolvePublic, systemResolver, type AddressPolicy, type Resolver } from './ssrf';

export type ProxyOptions = {
  resolver?: Resolver;
  allowed?: AddressPolicy;
  /** Called when a connection is refused, for logging and tests. */
  onBlocked?: (host: string, reason: string) => void;
};

export type SafeProxy = {
  port: number;
  close(): Promise<void>;
  /** Response bytes relayed so far; used for the 50 MB response cap. */
  bytes(): number;
  /** Requests refused so far. */
  blocked(): number;
};

/**
 * The capture browser's only way out (Chromium runs with --proxy-server pointing here).
 *
 * Each request or CONNECT tunnel resolves the target host once, checks every address, and connects
 * to the checked address — never re-resolving. That covers redirects (each hop is a new request),
 * subresources, websockets and DNS rebinding (a second lookup can't change where we connect).
 *
 * One proxy per job, so byte counts and blocks belong to that job.
 */
export function startSafeProxy(opts: ProxyOptions = {}): Promise<SafeProxy> {
  const resolver = opts.resolver ?? systemResolver;
  const allowed = opts.allowed ?? defaultPolicy;
  let total = 0;
  let refused = 0;
  const sockets = new Set<net.Socket>();
  const count = (n: number) => {
    total += n;
  };
  const block = (host: string, err: unknown) => {
    refused++;
    opts.onBlocked?.(host, String(err));
  };

  const target = async (host: string, port: number): Promise<string> => {
    if (!isAllowedPort(port)) throw new Error('port');
    return resolvePublic(host, resolver, allowed);
  };

  const server = http.createServer(async (req, res) => {
    // Plain-HTTP proxy request: absolute URL in the request line.
    let url: URL;
    try {
      url = new URL(req.url ?? '');
      if (url.protocol !== 'http:') throw new Error('scheme');
    } catch {
      res.writeHead(400).end();
      return;
    }
    const port = url.port ? Number(url.port) : 80;
    let ip: string;
    try {
      ip = await target(url.hostname, port);
    } catch (err) {
      block(url.hostname, err);
      res.writeHead(403, { 'x-weshot-blocked': '1' }).end('Blocked');
      return;
    }
    const headers = { ...req.headers };
    delete headers['proxy-authorization'];
    delete headers['proxy-connection'];
    headers.host = url.host;
    const upstream = http.request(
      { host: ip, port, method: req.method, path: `${url.pathname}${url.search}`, headers, setHost: false },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.on('data', (c: Buffer) => count(c.length));
        up.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  });

  server.on('connect', async (req: http.IncomingMessage, client: Duplex, head: Buffer) => {
    const [host, portStr] = splitHostPort(req.url ?? '');
    const port = Number(portStr || 443);
    let ip: string;
    try {
      ip = await target(host, port);
    } catch (err) {
      block(host, err);
      client.end('HTTP/1.1 403 Forbidden\r\nx-weshot-blocked: 1\r\n\r\n');
      return;
    }
    const upstream = net.connect({ host: ip, port }, () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      upstream.on('data', (c: Buffer) => count(c.length));
      upstream.pipe(client);
      client.pipe(upstream);
    });
    sockets.add(upstream);
    upstream.on('close', () => sockets.delete(upstream));
    const fail = () => {
      upstream.destroy();
      client.destroy();
    };
    upstream.on('error', fail);
    client.on('error', fail);
  });

  server.on('connection', (s) => {
    sockets.add(s);
    s.on('close', () => sockets.delete(s));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      resolve({
        port,
        bytes: () => total,
        blocked: () => refused,
        close: () =>
          new Promise<void>((r) => {
            for (const s of sockets) s.destroy();
            server.close(() => r());
          }),
      });
    });
  });
}

function splitHostPort(authority: string): [string, string] {
  const m = /^\[([^\]]+)\]:(\d+)$/.exec(authority) ?? /^([^:]+):(\d+)$/.exec(authority);
  return m ? [m[1]!, m[2]!] : [authority, ''];
}
