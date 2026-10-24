import type { Page } from 'playwright-core';

/** Heuristics for "This site blocks automated browsers." (product spec §6, BOT_CHECK). */
export async function looksLikeBotWall(page: Page, status: number | null, headers: Record<string, string>): Promise<boolean> {
  if (headers['cf-mitigated'] === 'challenge') return true;
  const title = (await page.title().catch(() => '')).toLowerCase();
  if (/just a moment|attention required|access denied|are you a robot|verify you are human|pardon our interruption|security check/.test(title)) {
    return true;
  }
  const marker = await page
    .evaluate(() =>
      Boolean(
        document.querySelector(
          '#challenge-form, #challenge-running, #cf-challenge-running, iframe[src*="challenges.cloudflare.com"], #px-captcha, iframe[src*="captcha-delivery.com"], iframe[src*="hcaptcha.com"], .g-recaptcha[data-size="normal"], #distil_ident_block',
        ),
      ),
    )
    .catch(() => false);
  if (marker) return true;
  return (status === 403 || status === 429 || status === 503) && /cloudflare|akamai|datadome|perimeterx|imperva|incapsula/i.test(headers.server ?? '');
}
