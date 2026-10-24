import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FiltersEngine, Request } from '@ghostery/adblocker';

/**
 * Ad and tracker blocking (product spec §4.6 step 3) with Ghostery's engine. "full" adds the annoyance
 * and cookie-notice lists and is used when hideBanners is on. Lists are fetched once per server instance and
 * cached in /tmp; if they cannot be fetched quickly, captures run without blocking rather than failing.
 */
type Kind = 'ads' | 'full';
const engines = new Map<Kind, Promise<FiltersEngine | null>>();
const cacheDir = join(process.env.ADBLOCK_CACHE_DIR || tmpdir(), 'weshot-adblock');

async function load(kind: Kind): Promise<FiltersEngine | null> {
  if (process.env.ADBLOCK_DISABLED === '1') return null;
  try {
    await mkdir(cacheDir, { recursive: true });
    const caching = {
      path: join(cacheDir, `${kind}.bin`),
      read: (p: string) => readFile(p),
      write: (p: string, buf: Uint8Array) => writeFile(p, buf),
    };
    const signal = AbortSignal.timeout(5_000);
    const f = ((url: string) => fetch(url, { signal })) as typeof fetch;
    return kind === 'full' ? await FiltersEngine.fromPrebuiltFull(f, caching) : await FiltersEngine.fromPrebuiltAdsAndTracking(f, caching);
  } catch (err) {
    console.warn(`[adblock] ${kind} lists unavailable, continuing without blocking:`, (err as Error).message);
    engines.delete(kind); // try again on a later capture
    return null;
  }
}

export function getBlocker(kind: Kind): Promise<FiltersEngine | null> {
  let p = engines.get(kind);
  if (!p) {
    p = load(kind);
    engines.set(kind, p);
  }
  return p;
}

export function shouldBlock(blocker: FiltersEngine | null, url: string, sourceUrl: string, type: string): boolean {
  if (!blocker) return false;
  try {
    // Playwright resource types map onto the engine's webRequest types closely enough for blocking.
    return blocker.match(Request.fromRawDetails({ url, sourceUrl, type: type as never })).match;
  } catch {
    return false;
  }
}
