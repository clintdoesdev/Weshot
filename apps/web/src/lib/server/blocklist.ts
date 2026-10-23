import { BLOCKLIST } from './blocklist-data';

const set = new Set(BLOCKLIST.map((d) => d.toLowerCase()));

/**
 * Domain blocklist (product spec §5): known phishing/malware and adult sites. Matches the host and every
 * parent domain, so "a.b.example.com" is blocked when "example.com" is listed. Extend via BLOCKLIST_EXTRA
 * (comma-separated) without a deploy of the list file.
 */
export function isBlockedDomain(host: string): boolean {
  const extra = (process.env.BLOCKLIST_EXTRA ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const parts = host.toLowerCase().replace(/\.$/, '').split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const d = parts.slice(i).join('.');
    if (set.has(d) || extra.includes(d)) return true;
  }
  return false;
}
