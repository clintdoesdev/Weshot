/** URL helpers shared by the paste bar, the API and the worker. */

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * Normalise what a user typed into an absolute http(s) URL.
 * Adds `https://` when no scheme is given. Returns null when it does not look like a web address.
 * Private and local hosts are *not* rejected here; the worker does that after DNS resolution.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const withScheme = SCHEME_RE.test(trimmed) && !/^[^/]+:\d+/.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const isIp = IPV4_RE.test(host) || host.includes(':');
  if (!isIp && host !== 'localhost' && !HOST_RE.test(host)) return null;
  if (url.username || url.password) return null;
  return url.toString();
}

/** Whether pasted text should be treated as a link (fills the bar and auto-submits). */
export function looksLikeUrl(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 2048 || /\s/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return normalizeUrl(t) !== null;
  return /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#:].*)?$/i.test(t) && normalizeUrl(t) !== null;
}

/** Short display form for the frame's URL pill: host + path, no scheme, no trailing slash. */
export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return `${u.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return url;
  }
}
