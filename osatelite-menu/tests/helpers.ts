import { expect, type Page } from '@playwright/test';

export const OUT_DIR = process.env.E2E_OUT_DIR ?? 'test-results/downloads';

/** Opens the app in local demonstration mode with a fresh seeded store. */
export async function openFresh(page: Page) {
  await page.goto('/?storage=local');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Menu do dia' })).toBeVisible();
}

export async function reopen(page: Page) {
  await page.reload();
  await expect(page.getByRole('button', { name: 'Menu do dia' })).toBeVisible();
}

export function lisbonToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function pt(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export async function tab(page: Page, name: 'Menu do dia' | 'Pratos guardados' | 'Histórico' | 'Definições') {
  await page.getByRole('navigation', { name: 'Secções' }).getByRole('button', { name }).click();
}

export async function waitSaved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText('Guardado', { timeout: 10_000 });
}

/** Text content of the preview SVG, in drawing order. */
export async function previewTexts(page: Page): Promise<string[]> {
  await expect(page.locator('#menu-preview')).toBeVisible();
  return page.locator('#menu-preview text').allTextContents();
}

export async function createDish(page: Page, name: string, category: string, price: string, serving = '') {
  await page.getByTestId('btn-new-dish').click();
  const dialog = page.getByRole('dialog', { name: 'Novo prato' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('Categoria').selectOption(category);
  await dialog.getByLabel('Preço por defeito (€)').fill(price);
  if (serving) await dialog.getByLabel('Informação de dose (opcional)').fill(serving);
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Picks the first date from today (Lisbon) that has no menu yet, fills the start screen and duplicates the latest menu. */
export async function duplicateLatestToFreeDate(page: Page): Promise<string> {
  let date = lisbonToday();
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('start-date').fill(date);
    if (await page.getByTestId('btn-duplicate-latest').isVisible()) break;
    date = addDays(date, 1);
  }
  await page.getByTestId('btn-duplicate-latest').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  return date;
}

export async function startEmptyOnFreeDate(page: Page): Promise<string> {
  let date = lisbonToday();
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('start-date').fill(date);
    if (await page.getByTestId('btn-start-empty').isVisible()) break;
    date = addDays(date, 1);
  }
  await page.getByTestId('btn-start-empty').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  return date;
}
