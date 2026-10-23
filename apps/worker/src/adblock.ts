import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Request } from '@ghostery/adblocker';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';

/**
 * Ad and tracker blocking (product spec §4.6 step 3) with Ghostery's engine. "full" adds the annoyance
 * and cookie-notice lists and is used when hideBanners is on. Lists are fetched once and cached on disk;
 * if they cannot be fetched, captures run without blocking rather than failing.
 */
type Kind = 'ads' | 'full';
const engines = new Map<Kind, Promise<PlaywrightBlocker | null>>();
const cacheDir = join(process.env.ADBLOCK_CACHE_DIR || tmpdir(), 'weshot-adblock');

async function load(kind: Kind): Promise<PlaywrightBlocker | null> {
  if (process.env.ADBLOCK_DISABLED === '1') return null;
  await mkdir(cacheDir, { recursive: true });
  const path = join(cacheDir, `${kind}.bin`);
  const caching = {
    path,
    read: (p: string) => readFile(p),
    write: (p: string, buf: Uint8Array) => writeFile(p, buf),
  };
  try {
    const timeout = AbortSignal.timeout(15_000);
    const f = (url: string) => fetch(url, { signal: timeout });
    return kind === 'full'
      ? await PlaywrightBlocker.fromPrebuiltFull(f as typeof fetch, caching)
      : await PlaywrightBlocker.fromPrebuiltAdsAndTracking(f as typeof fetch, caching);
  } catch (err) {
    console.warn(`[adblock] ${kind} lists unavailable, continuing without blocking:`, (err as Error).message);
    return null;
  }
}

export function getBlocker(kind: Kind): Promise<PlaywrightBlocker | null> {
  let p = engines.get(kind);
  if (!p) {
    p = load(kind);
    engines.set(kind, p);
  }
  return p;
}

export function shouldBlock(blocker: PlaywrightBlocker | null, url: string, sourceUrl: string, type: string): boolean {
  if (!blocker) return false;
  try {
    // Playwright resource types map onto the engine's webRequest types closely enough for blocking.
    const { match } = blocker.match(Request.fromRawDetails({ url, sourceUrl, type: type as never }));
    return match;
  } catch {
    return false;
  }
}
