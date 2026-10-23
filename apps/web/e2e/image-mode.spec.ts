import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dropImage, EMOJI, pasteImage } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('img', { name: /Framed sample page queuely\.app on Honey background/ })).toBeVisible();
});

test('landing shows the spec copy, no emoji, no sign-in or pricing', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your website, beautifully framed.');
  await expect(page.getByPlaceholder('Paste a link or an image').first()).toBeVisible();
  await expect(page.getByText('Free, no account. Drop a screenshot anywhere on the page to frame it.')).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(EMOJI);
  expect(text).not.toMatch(/sign in|log in|pricing|credits|watermark/i);
  const upper = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *')).filter((el) => getComputedStyle(el).textTransform === 'uppercase').length,
  );
  expect(upper).toBe(0);
});

test('pasting an image anywhere frames it locally', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') requests.push(r.url());
  });
  await pasteImage(page);
  await expect(page.getByRole('img', { name: 'Framed pasted screenshot on Honey background' })).toBeVisible();
  expect(requests).toEqual([]);
  // Capture-only controls are disabled for images.
  await expect(page.locator('#tile-capture fieldset[disabled]')).toHaveCount(1);
  await expect(page.locator('#tile-capture [role="tooltip"]')).toHaveText('Available for links');
});

test('dropping an image frames it', async ({ page }) => {
  await dropImage(page);
  await expect(page.getByRole('img', { name: /pasted screenshot/ })).toBeVisible();
});

test('invalid input shows the error copy under the bar', async ({ page }) => {
  const input = page.locator('#ws-paste-input');
  await input.fill('not a link');
  await input.press('Enter');
  await expect(page.getByText("That doesn't look like a web address.").filter({ visible: true })).toBeVisible();
  await expect(input).toBeFocused();
});

test('background swatches, presets and tabs drive the preview', async ({ page }) => {
  await page.getByRole('button', { name: 'Use Midnight glow background' }).click();
  await expect(page.getByRole('img', { name: /on Midnight glow background/ })).toBeVisible();
  await page.getByRole('button', { name: 'Minimal', exact: true }).click();
  await expect(page.getByRole('img', { name: /on Paper background/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Minimal', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: 'Layout' }).click();
  await expect(page.locator('#tile-layout')).toHaveClass(/border-ws-yellow-line/);
});

test('download PNG at 2x has the X post size doubled', async ({ page }) => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download', exact: true }).click()]);
  expect(download.suggestedFilename()).toBe('weshot-queuely-app-3200x1800.png');
  const buf = readFileSync((await download.path())!);
  expect(buf.readUInt32BE(16)).toBe(3200);
  expect(buf.readUInt32BE(20)).toBe(1800);
});

type Compare = { width: number; height: number; mainWidth: number; mainHeight: number; diff: number; maxDelta: number };
const compare = (page: Page, scale: number) =>
  page.evaluate((s) => (window as never as { __weshot: { compareExportWithMainThread: (s: number) => Promise<Compare> } }).__weshot.compareExportWithMainThread(s), scale);

for (const scale of [1, 2, 4]) {
  test(`download matches the preview pixel for pixel at ${scale}x (pasted image)`, async ({ page }) => {
    await pasteImage(page, 1440, 900);
    await expect(page.getByRole('img', { name: /pasted screenshot/ })).toBeVisible();
    const r = await compare(page, scale);
    expect([r.width, r.height]).toEqual([r.mainWidth, r.mainHeight]);
    expect(r.diff).toBe(0);
  });
}

test('download matches the preview pixel for pixel with grain, blur and title bar text', async ({ page }) => {
  await page.getByRole('button', { name: 'Portfolio', exact: true }).click();
  await page.getByRole('slider', { name: 'Blur' }).fill('12');
  for (const scale of [1, 2]) {
    const r = await compare(page, scale);
    expect(r.diff).toBe(0);
  }
});

test('presets: save current, export and import JSON', async ({ page }) => {
  await page.getByRole('button', { name: 'Use Graphite background' }).click();
  await page.getByRole('button', { name: 'Save current' }).click();
  await page.getByLabel('Preset name').fill('My graphite');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'My graphite' })).toHaveAttribute('aria-pressed', 'true');
  const stored = await page.evaluate(() => localStorage.getItem('weshot.presets.v1'));
  expect(stored).toContain('My graphite');

  await page.getByRole('button', { name: 'Preset options' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Export presets' }).click()]);
  const json = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(json.app).toBe('weshot');
  expect(json.presets[0].name).toBe('My graphite');

  await page.reload();
  await expect(page.getByRole('button', { name: 'My graphite' })).toBeVisible();
  await page.locator('input[aria-label="Import presets file"]').setInputFiles({
    name: 'p.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...json, presets: [{ ...json.presets[0], name: 'Imported look' }] })),
  });
  await expect(page.getByRole('button', { name: 'Imported look' })).toBeVisible();
});

test('copy image shows the toast', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByText('Image copied')).toBeVisible();
});

test('keyboard shortcuts work on the editor region', async ({ page }) => {
  await page.getByRole('tab', { name: 'Background' }).focus();
  await page.keyboard.press('4');
  await expect(page.getByRole('tab', { name: 'Layout' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Shift+?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});
