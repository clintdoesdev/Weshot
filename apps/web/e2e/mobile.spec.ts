import { expect, test } from '@playwright/test';
import { openHome, pasteImage } from './helpers';

test('mobile: Frame it opens the editor with the bottom sheet and download sheet', async ({ page }) => {
  await openHome(page);
  await expect(page.getByText('Free, no account. Or')).toBeVisible();
  await page.getByRole('button', { name: 'Open the editor' }).click();
  const editor = page.getByRole('region', { name: 'Editor' });
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('tab', { name: 'Background' })).toHaveAttribute('aria-selected', 'true');
  await expect(editor.getByRole('button', { name: 'Use Honey background' })).toBeVisible();
  await editor.getByRole('button', { name: 'Download', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Download' });
  await expect(sheet).toBeVisible();
  await sheet.getByText('Instagram').click();
  await expect(sheet.getByRole('button', { name: 'Download PNG' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await page.goBack();
  await expect(editor).toBeHidden();
});

test('mobile: pasting an image opens the editor', async ({ page }) => {
  await openHome(page);
  await pasteImage(page);
  await expect(page.getByRole('region', { name: 'Editor' }).getByRole('img', { name: /pasted screenshot/ })).toBeVisible();
});

test('mobile: the controls sheet expands and collapses from the grabber', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Open the editor' }).click();
  const editor = page.getByRole('region', { name: 'Editor' });
  const grabber = editor.getByRole('button', { name: 'Show more controls' });
  await expect(grabber).toHaveAttribute('aria-expanded', 'false');
  const panel = editor.locator('#mobile-tab-panel');
  const before = (await panel.boundingBox())!.height;
  await grabber.click();
  const collapse = editor.getByRole('button', { name: 'Show the preview larger' });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(async () => (await panel.boundingBox())!.height).toBeGreaterThan(before + 100);
  // The preview stays on screen so changes are still visible.
  await expect(editor.getByRole('img', { name: /^Framed/ })).toBeVisible();
  await collapse.click();
  await expect(editor.getByRole('button', { name: 'Show more controls' })).toBeVisible();
});
