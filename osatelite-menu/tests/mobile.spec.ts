import { expect, test } from '@playwright/test';
import path from 'node:path';
import { OUT_DIR, duplicateLatestToFreeDate, openFresh, waitSaved } from './helpers';

test('mobile: switch between editing and previewing', async ({ page }) => {
  await openFresh(page);
  await duplicateLatestToFreeDate(page);
  await waitSaved(page);
  await expect(page.locator('#menu-preview')).toBeHidden();
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-editor.png') });
  await page.getByRole('tab', { name: 'Pré-visualizar' }).click();
  await expect(page.locator('#menu-preview')).toBeVisible();
  await expect(page.getByTestId('editor')).toBeHidden();
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-preview.png') });
  await page.getByRole('tab', { name: 'Editar' }).click();
  await expect(page.getByTestId('editor')).toBeVisible();
});
