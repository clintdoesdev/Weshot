import { expect, test } from '@playwright/test';
import { pasteImage } from './helpers';

/** Share links (product spec §2.1, §4.5; UI spec §4 "Share created"). */
test('create a share link, open it, check OG + noindex, then delete it', async ({ page }) => {
  await page.goto('/');
  await pasteImage(page, 1200, 800, '#22aa66');
  await expect(page.getByRole('img', { name: /pasted screenshot/ })).toBeVisible();

  const [uploadReq] = await Promise.all([
    page.waitForRequest((r) => r.url().endsWith('/api/uploads') && r.method() === 'POST'),
    page.locator('#tile-export').getByRole('button', { name: 'Share link' }).click(),
  ]);
  expect(uploadReq.postDataJSON()).toEqual({ kind: 'share', contentType: 'image/png' });

  const dialog = page.getByRole('dialog', { name: 'Share link' });
  const url = dialog.locator('#ws-share-url');
  await expect(url).toHaveValue(/\/s\/[0-9A-Za-z]{10}$/, { timeout: 15_000 });
  await expect(dialog.getByText('Expires in 30 days')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Copy link' })).toBeVisible();
  const shareUrl = await url.inputValue();
  const id = shareUrl.split('/s/')[1]!;
  const stored = await page.evaluate(() => localStorage.getItem('weshot.shares.v1'));
  expect(stored).toContain(id);
  expect(stored).toContain('deleteToken');

  await page.goto(`/s/${id}`);
  await expect(page.getByRole('img', { name: 'Framed screenshot made with WeShot' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute('content', /\/api\/files\/shares\//);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.getByRole('link', { name: 'Report this page' })).toBeVisible();
  const img = await page.getByRole('img', { name: 'Framed screenshot made with WeShot' }).evaluate((el: HTMLImageElement) => el.naturalWidth);
  expect(img).toBe(3200);

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForURL((u) => u.pathname === '/');
  const res = await page.goto(`/s/${id}`);
  expect(res?.status()).toBe(404);
  await expect(page.getByText('This link has expired')).toBeVisible();
});

test('delete needs the right token', async ({ request }) => {
  const res = await request.delete('/api/share/AAAAAAAAAA', { headers: { 'x-delete-token': 'nope' } });
  expect(res.status()).toBe(404);
});
