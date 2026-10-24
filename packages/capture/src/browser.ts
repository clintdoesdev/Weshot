import type { CaptureSettings } from '@weshot/shared';
import { LIMITS } from '@weshot/shared';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { getBlocker, shouldBlock } from './adblock';
import { HIDE_CSS } from './banners';
import { CaptureError } from './errors';
import { startSafeProxy, type SafeProxy } from './proxy';
import type { AddressPolicy, Resolver } from './ssrf';

export type SessionDeps = { resolver?: Resolver; allowed?: AddressPolicy; adblock?: boolean };

export type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  proxy: SafeProxy;
  /** True once the 50 MB response cap was hit; further requests are aborted. */
  capped: () => boolean;
  /** Rejects when the main-frame navigation follows more than 5 redirects. */
  redirectGuard: Promise<never>;
  close: () => Promise<void>;
};

/** Chromium flags that keep every byte on the proxy: no QUIC, no non-proxied WebRTC UDP, no DNS prefetch. */
const ARGS = [
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--disable-sync',
  '--dns-prefetch-disable',
  '--disable-quic',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--hide-scrollbars',
  '--mute-audio',
];

export function userAgent(chromeVersion: string, mobile: boolean): string {
  const major = chromeVersion.split('.')[0] ?? '140';
  return mobile
    ? `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Mobile Safari/537.36`
    : `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

/** On Vercel (or any serverless Linux) use the bundled @sparticuz/chromium; elsewhere Playwright's installed Chromium. */
async function launchOptions(): Promise<{ executablePath?: string; args: string[] }> {
  const serverless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!serverless) return { args: ARGS };
  const { default: sparticuz } = await import('@sparticuz/chromium');
  sparticuz.setGraphicsMode = false;
  return { executablePath: await sparticuz.executablePath(), args: [...sparticuz.args, ...ARGS] };
}

/**
 * A fresh browser behind a fresh SSRF proxy for one capture (product spec §4.6 step 2): isolated context,
 * viewport, deviceScaleFactor, colorScheme, realistic UA, no downloads, no service workers.
 */
export async function openSession(capture: CaptureSettings, deps: SessionDeps = {}): Promise<BrowserSession> {
  const proxy = await startSafeProxy({ resolver: deps.resolver, allowed: deps.allowed });
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      ...(await launchOptions()),
      headless: true,
      // `<-loopback>` removes Chromium's implicit proxy bypass for localhost, so loopback goes through the proxy too.
      proxy: { server: `http://127.0.0.1:${proxy.port}`, bypass: '<-loopback>' },
    });
    const mobile = capture.viewport.width <= 600;
    const context = await browser.newContext({
      viewport: capture.viewport,
      deviceScaleFactor: capture.scale,
      colorScheme: capture.colorScheme === 'auto' ? 'no-preference' : capture.colorScheme,
      userAgent: userAgent(browser.version(), mobile),
      isMobile: mobile,
      hasTouch: mobile,
      acceptDownloads: false,
      serviceWorkers: 'block',
      locale: 'en-US',
      ignoreHTTPSErrors: false,
    });
    context.setDefaultNavigationTimeout(Number(process.env.CAPTURE_TIMEOUT_MS) || LIMITS.navigationTimeoutMs);

    const blocker = deps.adblock === false ? null : await getBlocker(capture.hideBanners ? 'full' : 'ads');
    let capped = false;
    const pageUrl = capture.url;

    await context.route('**/*', async (route) => {
      const req = route.request();
      const url = req.url();
      if (!/^(https?|data|blob):/i.test(url)) return route.abort('blockedbyclient');
      if (!req.isNavigationRequest()) {
        if (proxy.bytes() > LIMITS.maxResponseBytes) {
          capped = true;
          return route.abort('blockedbyclient');
        }
        if (shouldBlock(blocker, url, req.frame().url() || pageUrl, req.resourceType())) return route.abort('blockedbyclient');
      }
      return route.continue();
    });

    if (capture.hideBanners) await context.addInitScript({ content: bannerInit });

    const page = await context.newPage();
    // Redirect hops are not routed, so count them from request events (product spec §4.6: max 5).
    // Each hop is still a new proxy request, so its target is re-checked there.
    const redirectGuard = new Promise<never>((_, reject) => {
      page.on('request', (req) => {
        if (!req.isNavigationRequest() || req.frame() !== page.mainFrame()) return;
        let hops = 0;
        for (let r = req.redirectedFrom(); r; r = r.redirectedFrom()) hops++;
        if (hops > LIMITS.maxRedirects) reject(new CaptureError('HTTP_4XX', 310));
      });
    });
    redirectGuard.catch(() => undefined);
    return {
      browser,
      context,
      page,
      proxy,
      capped: () => capped,
      redirectGuard,
      close: async () => {
        await browser?.close().catch(() => undefined);
        await proxy.close();
      },
    };
  } catch (err) {
    await browser?.close().catch(() => undefined);
    await proxy.close();
    throw err;
  }
}

// Injects the hiding stylesheet as early as possible on every document.
const bannerInit = `(() => {
  const css = ${JSON.stringify(HIDE_CSS)};
  const add = () => {
    if (document.getElementById('__weshot_hide')) return;
    const s = document.createElement('style');
    s.id = '__weshot_hide';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.documentElement) add();
  document.addEventListener('DOMContentLoaded', add);
})();`;
