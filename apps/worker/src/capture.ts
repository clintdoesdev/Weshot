import { LIMITS, type CaptureSettings, type JobStatus } from '@weshot/shared';
import type { Page } from 'playwright';
import { DISMISS_SCRIPT } from './banners';
import { looksLikeBotWall } from './botcheck';
import { openSession, type SessionDeps } from './browser';
import { CaptureError } from './errors';
import { assertPublicUrl } from './ssrf';

export type CaptureResult = { png: Buffer; width: number; height: number; title: string; truncated: boolean };

export type CaptureDeps = SessionDeps & { onStatus?: (s: JobStatus) => void | Promise<void> };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, sleep(ms).then(() => undefined)]);
}

/** Loads the page as specified in product spec §4.6 and returns the PNG. Shared by capture and record. */
export async function loadPage(capture: CaptureSettings, deps: CaptureDeps) {
  await assertPublicUrl(capture.url, deps.resolver, deps.allowed);
  const session = await openSession(capture, deps);
  const { page, proxy } = session;
  try {
    await deps.onStatus?.('loading');
    let response;
    try {
      // More than 5 redirects is reported as an HTTP error (310, "too many redirects"); see DECISIONS.md.
      response = await Promise.race([page.goto(capture.url, { waitUntil: 'domcontentloaded' }), session.redirectGuard]);
    } catch (err) {
      if (err instanceof CaptureError) throw err;
      const msg = (err as Error).message;
      if (proxy.blocked() > 0 && /ERR_TUNNEL_CONNECTION_FAILED|ERR_BLOCKED_BY_CLIENT|ERR_ABORTED|ERR_PROXY/.test(msg)) {
        throw new CaptureError('BLOCKED_HOST');
      }
      if (/Timeout/i.test(msg) || (err as Error).name === 'TimeoutError') throw new CaptureError('TIMEOUT');
      if (/ERR_NAME_NOT_RESOLVED|ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION_REFUSED|ERR_ADDRESS_UNREACHABLE/.test(msg)) {
        throw new CaptureError('INVALID_URL');
      }
      throw new CaptureError('TIMEOUT');
    }
    const headers = response?.headers() ?? {};
    if (headers['x-weshot-blocked']) throw new CaptureError('BLOCKED_HOST');
    const status = response?.status() ?? null;
    await withTimeout(page.waitForLoadState('networkidle'), LIMITS.networkIdleMaxMs).catch(() => undefined);
    if (await looksLikeBotWall(page, status, headers)) throw new CaptureError('BOT_CHECK');
    if (status !== null && status >= 400) throw new CaptureError(status >= 500 ? 'HTTP_5XX' : 'HTTP_4XX', status);

    await deps.onStatus?.('fonts');
    await withTimeout(page.evaluate(() => document.fonts.ready.then(() => true)), 5000).catch(() => undefined);

    if (capture.hideBanners) {
      const clicked = await page.evaluate(DISMISS_SCRIPT).catch(() => false);
      if (clicked) await sleep(400);
    }
    return session;
  } catch (err) {
    await session.close();
    throw err;
  }
}

/** Scroll through the page so lazy images load, then return to the top. */
async function lazyLoadPass(page: Page): Promise<void> {
  await page.evaluate(async (max) => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < Math.min(document.documentElement.scrollHeight, max); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  }, LIMITS.maxFullPageHeight);
}

export async function capturePage(capture: CaptureSettings, deps: CaptureDeps = {}): Promise<CaptureResult> {
  const session = await loadPage(capture, deps);
  const { page } = session;
  try {
    let truncated = false;
    let height = capture.viewport.height;
    if (capture.fullPage) {
      await withTimeout(lazyLoadPass(page), 15_000);
      await withTimeout(page.waitForLoadState('networkidle'), 3000).catch(() => undefined);
      const full = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0));
      truncated = full > LIMITS.maxFullPageHeight;
      height = Math.max(capture.viewport.height, Math.min(full, LIMITS.maxFullPageHeight));
    }
    if (capture.delayMs > 0) await sleep(capture.delayMs);
    await deps.onStatus?.('capturing');
    const png = capture.fullPage
      ? await page.screenshot({ type: 'png', fullPage: true, clip: { x: 0, y: 0, width: capture.viewport.width, height } })
      : await page.screenshot({ type: 'png' });
    const title = (await page.title().catch(() => '')).slice(0, 200);
    return {
      png,
      width: capture.viewport.width * capture.scale,
      height: height * capture.scale,
      title,
      truncated,
    };
  } finally {
    await session.close();
  }
}
