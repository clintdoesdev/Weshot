import { expect, test, type Page } from '@playwright/test';
import { openHome, pasteImage } from './helpers';

/** Recording flow against the mocked worker (product spec §3.3, UI spec §3.2, §4). */
async function captureLink(page: Page) {
  await openHome(page);
  await page.locator('#ws-paste-input').fill('mock-site.test');
  await page.locator('#ws-paste-input').press('Enter');
  await expect(page.getByRole('img', { name: /screenshot of mock-site\.test/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Loading page|Waiting for fonts|Framing/)).toHaveCount(0, { timeout: 10_000 });
}

test('record a scroll video: aside, status pill, Video ready, Download MP4', async ({ page }) => {
  await captureLink(page);
  await page.getByRole('tab', { name: 'Record' }).click();
  const aside = page.getByRole('complementary', { name: 'Editor controls' });
  await expect(aside).toBeVisible();
  await expect(aside.getByRole('tab', { name: 'Record' })).toHaveAttribute('aria-selected', 'true');
  await expect(aside.getByRole('button', { name: /Scroll-through/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(aside.getByText('Ease in and out')).toBeVisible();

  await aside.getByRole('button', { name: 'Record scroll video' }).click();
  const pill = page.getByRole('status').filter({ hasText: 'Stop' });
  await expect(pill).toBeVisible();
  await expect(pill).toContainText(/\d+\.\d s \/ 12 s/);
  await expect(aside.getByRole('button', { name: 'Recording in progress' })).toBeDisabled();
  await expect(aside.getByText('You can keep styling while it records.')).toBeVisible();

  // Styling stays live while it records.
  await aside.getByRole('tab', { name: 'Background' }).click();
  await aside.getByRole('button', { name: 'Use Graphite background' }).click();
  await expect(page.getByRole('img', { name: /on Graphite background/ })).toBeVisible();

  const toast = page.getByRole('status').filter({ hasText: 'Video ready' });
  await expect(toast).toBeVisible({ timeout: 10_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), toast.getByRole('button', { name: 'Download MP4' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.mp4$/);
});

test('GIF caps the length at 15 s and locks the frame rate', async ({ page }) => {
  await captureLink(page);
  await page.getByRole('tab', { name: 'Record' }).click();
  const aside = page.getByRole('complementary', { name: 'Editor controls' });
  await aside.getByRole('slider', { name: 'Length' }).fill('40');
  await aside.getByRole('button', { name: 'GIF' }).click();
  await expect(aside.getByRole('slider', { name: 'Length' })).toHaveValue('15');
  await expect(aside.getByRole('button', { name: '60 fps' })).toBeDisabled();
});

test('recording is link-only', async ({ page }) => {
  await openHome(page);
  await pasteImage(page);
  await page.getByRole('tab', { name: 'Record' }).click();
  const aside = page.getByRole('complementary', { name: 'Editor controls' });
  await expect(aside.getByRole('tooltip')).toHaveText('Available for links');
  await expect(aside.getByRole('button', { name: 'Record scroll video' })).toBeDisabled();
});
