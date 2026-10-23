import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { CaptureError } from './errors';

/**
 * SSRF protection, product spec §4.6.
 *
 * Every hostname the capture browser contacts is resolved here and every resulting address is checked.
 * Blocked: 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16 (incl. 169.254.169.254), ::1, fc00::/7 — the
 * ranges the spec lists — plus every other non-public range (0/8, 100.64/10 CGNAT, multicast, reserved,
 * fe80::/10, IPv4-mapped and NAT64 forms of the above).
 */
const EXPLICIT_V4 = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', '169.254.0.0/16', '0.0.0.0/8', '100.64.0.0/10'];
const EXPLICIT_V6 = ['::1/128', 'fc00::/7', 'fe80::/10', '::/128'];

const v4Ranges = EXPLICIT_V4.map((c) => ipaddr.IPv4.parseCIDR(c));
const v6Ranges = EXPLICIT_V6.map((c) => ipaddr.IPv6.parseCIDR(c));

export function isBlockedAddress(address: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    // process() unwraps IPv4-mapped IPv6 (::ffff:10.0.0.1) to IPv4.
    addr = ipaddr.process(address.replace(/^\[|\]$/g, '').replace(/%.*$/, ''));
  } catch {
    return true;
  }
  if (addr.kind() === 'ipv4') {
    const v4 = addr as ipaddr.IPv4;
    if (v4Ranges.some((r) => v4.match(r))) return true;
    return v4.range() !== 'unicast';
  }
  const v6 = addr as ipaddr.IPv6;
  if (v6Ranges.some((r) => v6.match(r))) return true;
  // NAT64 / 6to4 / Teredo embed an IPv4 address; check it.
  const range = v6.range();
  if (range === 'rfc6052' || range === 'rfc6145') {
    const bytes = v6.toByteArray().slice(-4);
    return isBlockedAddress(bytes.join('.'));
  }
  if (range === '6to4') {
    const b = v6.toByteArray();
    return isBlockedAddress(`${b[2]}.${b[3]}.${b[4]}.${b[5]}`);
  }
  return range !== 'unicast';
}

export type Resolver = (host: string) => Promise<string[]>;

export const systemResolver: Resolver = async (host) => {
  const res = await lookup(host, { all: true, verbatim: true });
  return res.map((r) => r.address);
};

/** Policy used by the proxy and the pre-flight check; overridable in tests. */
export type AddressPolicy = (address: string) => boolean;
export const defaultPolicy: AddressPolicy = (a) => !isBlockedAddress(a);

/**
 * Resolve a host and return one address that passes the policy. All resolved addresses must pass:
 * a host that resolves to both a public and a private address is rejected.
 */
export async function resolvePublic(host: string, resolver: Resolver = systemResolver, allowed: AddressPolicy = defaultPolicy): Promise<string> {
  const bare = host.replace(/^\[|\]$/g, '');
  if (isIP(bare)) {
    if (!allowed(bare)) throw new CaptureError('BLOCKED_HOST');
    return bare;
  }
  if (/^localhost$/i.test(bare) || /\.localhost$/i.test(bare) || /\.(local|internal|localdomain)$/i.test(bare)) {
    throw new CaptureError('BLOCKED_HOST');
  }
  let addresses: string[];
  try {
    addresses = await resolver(bare);
  } catch {
    throw new CaptureError('INVALID_URL');
  }
  if (addresses.length === 0) throw new CaptureError('INVALID_URL');
  if (!addresses.every(allowed)) throw new CaptureError('BLOCKED_HOST');
  return addresses[0]!;
}

/** Scheme + DNS check before a job starts. Non-http(s) schemes are rejected. */
export async function assertPublicUrl(raw: string, resolver?: Resolver, allowed?: AddressPolicy): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CaptureError('INVALID_URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new CaptureError('BLOCKED_HOST');
  if (url.username || url.password) throw new CaptureError('INVALID_URL');
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  if (!isAllowedPort(port)) throw new CaptureError('BLOCKED_HOST');
  await resolvePublic(url.hostname, resolver, allowed);
  return url;
}

/** Web ports only; keeps the browser away from SMTP, Redis and other internal services on public hosts. */
export function isAllowedPort(port: number): boolean {
  return port === 80 || port === 443 || (port >= 1024 && port <= 65535 && !BLOCKED_HIGH_PORTS.has(port));
}
const BLOCKED_HIGH_PORTS = new Set([2375, 2376, 2379, 3306, 5432, 6379, 6443, 9200, 9300, 10250, 11211, 27017]);
