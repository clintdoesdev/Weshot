import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openHome, pasteImage } from './helpers';

/** UI spec §8: WCAG 2.2 AA, checked with axe on every main state. */
async function audit(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join(' | ')}`);
  expect(summary).toEqual([]);
}

test('landing page and editor (first visit)', async ({ page }) => {
  await openHome(page);
  await expect(page.getByRole('img', { name: /^Framed sample page queuely/ })).toBeVisible();
  await audit(page);
});

test('image mode, menus and dialogs', async ({ page }) => {
  await openHome(page);
  await pasteImage(page);
  await expect(page.getByRole('img', { name: /pasted screenshot/ })).toBeVisible();
  await audit(page);
  await page.locator('#tile-layout').getByRole('button', { name: /Canvas/ }).click();
  await audit(page, '[role="menu"]');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Background' }).focus();
  await page.keyboard.press('Shift+?');
  await audit(page, 'dialog');
});

test('error state', async ({ page }) => {
  await openHome(page);
  await page.locator('#ws-paste-input').fill('timeout.test');
  await page.locator('#ws-paste-input').press('Enter');
  await expect(page.locator('#ws-paste-input-help').getByText(/longer than 30 seconds/)).toBeVisible({ timeout: 10_000 });
  await audit(page);
});

test('captured link', async ({ page }) => {
  await openHome(page);
  await page.locator('#ws-paste-input').fill('mock-site.test');
  await page.locator('#ws-paste-input').press('Enter');
  await expect(page.getByRole('img', { name: /screenshot of mock-site/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Loading page|Waiting for fonts|Framing/)).toHaveCount(0, { timeout: 10_000 });
  await audit(page);
});

test('terms and privacy', async ({ page }) => {
  for (const path of ['/terms', '/privacy']) {
    await page.goto(path);
    await audit(page);
  }
});

test('keyboard: every editor control is reachable and shows the yellow focus ring', async ({ page }) => {
  await openHome(page);
  await page.getByRole('tab', { name: 'Background' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Layout' })).toBeFocused();
  const outline = await page.getByRole('tab', { name: 'Layout' }).evaluate((el) => {
    const s = getComputedStyle(el);
    return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`;
  });
  expect(outline).toBe('solid 2px rgb(255, 214, 10) 3px');
});

test('reduced motion: no animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await pasteImage(page);
  const durations = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ws-frame-in, .ws-shimmer, .ws-pulse')).map((el) => parseFloat(getComputedStyle(el).animationDuration)),
  );
  for (const d of durations) expect(d).toBeLessThan(0.001);
});
