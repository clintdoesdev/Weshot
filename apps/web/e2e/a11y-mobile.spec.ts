import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openHome } from './helpers';

test('mobile landing, editor sheet and download sheet pass axe', async ({ page }) => {
  const check = async () => {
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join(' | ')}`)).toEqual([]);
  };
  await openHome(page);
  await check();
  await page.getByRole('button', { name: 'Open the editor' }).click();
  await expect(page.getByRole('region', { name: 'Editor' })).toBeVisible();
  await check();
  await page.getByRole('region', { name: 'Editor' }).getByRole('button', { name: 'Download', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Download' })).toBeVisible();
  await check();
});
