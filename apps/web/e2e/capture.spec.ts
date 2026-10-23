import { expect, test, type Page } from '@playwright/test';

/** Link flow against the mocked worker (product spec §3.1, §6; UI spec §4). */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const bar = (page: Page) => page.locator('#ws-paste-input');

test('pasting a link fills the bar, shows the capture steps and frames the result', async ({ page }) => {
  await bar(page).fill('mock-site.test');
  await bar(page).press('Enter');
  await expect(page.getByRole('status').filter({ hasText: /Loading page|Waiting for fonts|Framing/ })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Framed screenshot of mock-site.test on Honey background' })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#editor').getByText('mock-site.test', { exact: true })).toBeVisible();
  await expect(page.locator('#tile-capture fieldset[disabled]')).toHaveCount(0);
});

test('page-wide paste of a URL auto-submits', async ({ page }) => {
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'https://pasted-link.test/pricing');
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  });
  await expect(bar(page)).toHaveValue('https://pasted-link.test/pricing');
  await expect(page.getByRole('img', { name: /screenshot of pasted-link\.test\/pricing/ })).toBeVisible({ timeout: 10_000 });
});

test('changing a capture setting shows Re-capture, which captures again', async ({ page }) => {
  await bar(page).fill('mock-site.test');
  await bar(page).press('Enter');
  await expect(page.getByRole('img', { name: /screenshot of mock-site\.test/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Re-capture' })).toHaveCount(0);
  await page.locator('#tile-capture').getByRole('button', { name: '3x' }).click();
  const recapture = page.getByRole('button', { name: 'Re-capture' });
  await expect(recapture).toBeVisible();
  await recapture.click();
  await expect(page.getByRole('img', { name: /screenshot of mock-site\.test/ })).toBeVisible({ timeout: 10_000 });
  await expect(recapture).toHaveCount(0);
});

const errors: Array<[string, string, string[]]> = [
  ['timeout.test', 'The page took longer than 30 seconds to load.', ['Retry', 'Paste a screenshot instead']],
  ['bot.test', 'This site blocks automated browsers.', ['Paste a screenshot instead']],
  ['error500.test', 'The site returned an error (503).', ['Retry']],
  ['private.test', "WeShot can't open private or local addresses.", ['Paste a screenshot instead']],
];
for (const [host, message, actions] of errors) {
  test(`error copy for ${host}`, async ({ page }) => {
    await bar(page).fill(host);
    await bar(page).press('Enter');
    const help = page.locator('#ws-paste-input-help');
    await expect(help.getByText(message)).toBeVisible({ timeout: 10_000 });
    for (const a of actions) await expect(help.getByRole('button', { name: a })).toBeVisible();
    // Never red: the bar border turns yellow-line.
    await expect(page.locator('form[role="search"]').first()).toHaveCSS('border-top-color', 'rgba(255, 214, 10, 0.7)');
  });
}

test('retry runs the capture again', async ({ page }) => {
  await bar(page).fill('timeout.test');
  await bar(page).press('Enter');
  const help = page.locator('#ws-paste-input-help');
  await expect(help.getByRole('button', { name: 'Retry' })).toBeVisible({ timeout: 10_000 });
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.url().endsWith('/api/capture') && r.method() === 'POST'),
    help.getByRole('button', { name: 'Retry' }).click(),
  ]);
  expect(req.postDataJSON().capture.url).toBe('https://timeout.test/');
  await expect(help.getByText('The page took longer than 30 seconds to load.')).toBeVisible({ timeout: 10_000 });
});

test('blocklisted domains are refused before capture', async ({ page }) => {
  await bar(page).fill('blocked-example.test');
  await bar(page).press('Enter');
  await expect(page.locator('#ws-paste-input-help').getByText("WeShot can't open this site.")).toBeVisible();
});

test('rate limit copy appears under the bar', async ({ page }) => {
  await bar(page).fill('ratelimit.test');
  await bar(page).press('Enter');
  await expect(page.locator('#ws-paste-input-help').getByText("You've made a lot of captures this hour. Try again in 42 min.")).toBeVisible();
});
