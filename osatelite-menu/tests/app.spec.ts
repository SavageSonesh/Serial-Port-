import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { OUT_DIR, addDays, createDish, duplicateLatestToFreeDate, lisbonToday, openFresh, previewTexts, pt, reopen, startEmptyOnFreeDate, tab, waitSaved } from './helpers';

test.beforeEach(async ({ page }) => {
  await openFresh(page);
});

test('demo mode is clearly labelled and the seed catalogue is present', async ({ page }) => {
  await expect(page.locator('.storage-badge')).toHaveText('Demonstração local');
  await tab(page, 'Pratos guardados');
  await expect(page.getByTestId('dish-list').locator('li')).toHaveCount(27);
  await expect(page.getByText('Lula Grande dos Açores Grelhada')).toBeVisible();
  await expect(page.getByText('Hambúrguer Grelhado com Batata e Arroz')).toBeVisible();
});

test('create a dish, reload, and it is still saved; duplicates are flagged', async ({ page }) => {
  await tab(page, 'Pratos guardados');
  await createDish(page, 'Bacalhau à Brás', 'peixe', '14,50');
  await expect(page.getByText('Bacalhau à Brás')).toBeVisible();
  await reopen(page);
  await tab(page, 'Pratos guardados');
  await page.getByLabel('Procurar prato').fill('bacalhau');
  await expect(page.getByTestId('dish-list').locator('li')).toHaveCount(1);
  await expect(page.getByText('Peixe · 14,50€')).toBeVisible();

  // Likely duplicate warning (accent/case-insensitive) before creating again
  await page.getByTestId('btn-new-dish').click();
  const dialog = page.getByRole('dialog', { name: 'Novo prato' });
  await dialog.getByLabel('Nome').fill('bacalhau a bras');
  await expect(dialog.getByRole('alert')).toContainText('Já existe um prato parecido');
  await dialog.getByLabel('Preço por defeito (€)').fill('10');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).toBeVisible(); // not saved yet
  await dialog.getByRole('button', { name: 'Guardar mesmo assim' }).click();
  await expect(dialog).toBeHidden();
  await page.getByLabel('Procurar prato').fill('bacalhau');
  await expect(page.getByTestId('dish-list').locator('li')).toHaveCount(2);
});

test("today's workflow: duplicate latest, remove from today, override price, catalogue untouched", async ({ page }) => {
  await expect(page.getByTestId('start-date')).toHaveValue(lisbonToday());
  // The seed menu is dated 2026-09-06; when that is "today" the start screen offers to open it instead of duplicating.
  if (lisbonToday() === '2026-09-06') await expect(page.getByTestId('btn-open-existing')).toBeVisible();
  const today = await duplicateLatestToFreeDate(page);
  await expect(page.getByTestId('menu-date')).toHaveValue(today);
  await waitSaved(page);
  await expect(page.getByText('27 prato(s) no menu')).toBeVisible();

  // Preview matches the reference structure and uses the new date
  let texts = await previewTexts(page);
  expect(texts[0]).toBe('PRATOS DO DIA');
  expect(texts).toContain('CANJA DE GALINHA');
  expect(texts).toContain('PEIXE');
  expect(texts).toContain('LULA GRANDE DOS AÇORES GRELHADA (2 PESSOAS)');
  expect(texts).toContain('Não temos Multibanco');
  expect(texts).toContain(pt(today));

  // Remove from today only
  await page.getByRole('button', { name: 'Remover Melão do menu de hoje' }).click();
  await expect(page.getByText('26 prato(s) no menu')).toBeVisible();
  await waitSaved(page);
  texts = await previewTexts(page);
  expect(texts).not.toContain('MELÃO');
  await tab(page, 'Pratos guardados');
  await page.getByLabel('Procurar prato').fill('melão');
  await expect(page.getByTestId('dish-list').locator('li')).toHaveCount(1); // still in catalogue
  await tab(page, 'Menu do dia');

  // Override today's price without touching the catalogue
  const priceInput = page.getByLabel('Preço de hoje de Canja de Galinha');
  await priceInput.fill('2,50');
  await priceInput.press('Enter');
  await waitSaved(page);
  await expect(page.getByText('Só hoje · catálogo 2,00€')).toBeVisible();
  texts = await previewTexts(page);
  expect(texts).toContain('2,50€');
  await reopen(page);
  await tab(page, 'Pratos guardados');
  await page.getByLabel('Procurar prato').fill('canja');
  await expect(page.getByText('Sopa · 2,00€')).toBeVisible();

  // Explicit action updates the catalogue default
  await tab(page, 'Menu do dia');
  await expect(page.getByTestId('editor')).toBeVisible();
  await page.getByRole('button', { name: 'Atualizar preço no catálogo' }).click();
  await expect(page.getByText('Só hoje · catálogo 2,00€')).toBeHidden();
  await tab(page, 'Pratos guardados');
  await page.getByLabel('Procurar prato').fill('canja');
  await expect(page.getByText('Sopa · 2,50€')).toBeVisible();
});

test('reordering with buttons updates the preview order', async ({ page }) => {
  await duplicateLatestToFreeDate(page);
  await waitSaved(page);
  await page.getByRole('button', { name: 'Descer Polvo à Lagareiro' }).click();
  await waitSaved(page);
  const texts = await previewTexts(page);
  expect(texts.indexOf('ARROZ DE GAMBAS')).toBeLessThan(texts.indexOf('POLVO À LAGAREIRO'));
  await expect(page.getByRole('button', { name: 'Subir Arroz de Gambas' })).toBeDisabled();
});

test('catalogue edits do not change historical menus; old menus keep their date', async ({ page }) => {
  await tab(page, 'Pratos guardados');
  await page.getByLabel('Procurar prato').fill('melão');
  await page.getByRole('button', { name: 'Editar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar prato' });
  await dialog.getByLabel('Nome').fill('Melão da Época');
  await dialog.getByLabel('Preço por defeito (€)').fill('3,90');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).toBeHidden();

  await tab(page, 'Histórico');
  await expect(page.getByTestId('menu-list').locator('li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Abrir' }).click();
  await expect(page.getByTestId('menu-date')).toHaveValue('2026-09-06');
  const texts = await previewTexts(page);
  expect(texts).toContain('MELÃO');
  expect(texts).not.toContain('MELÃO DA ÉPOCA');
  expect(texts).toContain('3,50€');
  expect(texts).toContain('06-09-2026');

  // Archive keeps the dish out of the picker but present in old menus
  await tab(page, 'Pratos guardados');
  await page.getByLabel('Procurar prato').fill('época');
  await page.getByRole('button', { name: 'Arquivar do catálogo' }).click();
  await expect(page.getByTestId('dish-list').locator('li')).toHaveCount(0);
  await page.getByLabel('Mostrar arquivados').check();
  await expect(page.getByText('· arquivado')).toBeVisible();
  await tab(page, 'Menu do dia');
  expect(await previewTexts(page)).toContain('MELÃO');
  await page.getByTestId('btn-pick').click();
  await expect(page.getByRole('dialog').getByText('Melão da Época')).toHaveCount(0);
  await page.getByRole('button', { name: 'Concluir' }).click();
  await tab(page, 'Pratos guardados');
  await page.getByLabel('Mostrar arquivados').check();
  await page.getByRole('button', { name: 'Restaurar' }).click();
  await page.getByLabel('Mostrar arquivados').uncheck();
  await page.getByLabel('Procurar prato').fill('época');
  await expect(page.getByTestId('dish-list').locator('li')).toHaveCount(1);
});

test('duplicate a historical menu to tomorrow; duplicate dates are refused', async ({ page }) => {
  const tomorrow = addDays(lisbonToday(), 1) === '2026-09-06' ? addDays(lisbonToday(), 2) : addDays(lisbonToday(), 1);
  await tab(page, 'Histórico');
  await page.getByRole('button', { name: 'Duplicar…' }).click();
  await page.getByTestId('dup-date').fill(tomorrow);
  await page.getByTestId('dup-confirm').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  await expect(page.getByTestId('menu-date')).toHaveValue(tomorrow);
  await waitSaved(page);
  await expect(page.getByText('27 prato(s) no menu')).toBeVisible();
  expect(await previewTexts(page)).toContain(pt(tomorrow));

  await tab(page, 'Histórico');
  await expect(page.getByTestId('menu-list').locator('li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Duplicar…' }).last().click();
  await page.getByTestId('dup-date').fill(tomorrow);
  await expect(page.getByText(`Já existe um menu para ${pt(tomorrow)}`)).toBeVisible();
  await expect(page.getByTestId('dup-confirm')).toBeDisabled();
  await page.keyboard.press('Escape');

  // Reload: both menus survive with their own dates
  await reopen(page);
  await tab(page, 'Histórico');
  await expect(page.getByTestId('menu-list').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('menu-list').getByText(pt(tomorrow), { exact: true })).toBeVisible();
  await expect(page.getByTestId('menu-list').getByText('06-09-2026', { exact: true })).toBeVisible();
});

test('overflow is detected and blocks export; empty categories are hidden', async ({ page }) => {
  await startEmptyOnFreeDate(page);
  await page.getByTestId('btn-pick').click();
  const dialog = page.getByRole('dialog', { name: 'Escolher pratos' });
  await dialog.getByText('Caril de Legumes').click();
  await dialog.getByRole('button', { name: 'Concluir' }).click();
  await waitSaved(page);
  let texts = await previewTexts(page);
  expect(texts).toContain('VEGETARIANO');
  expect(texts).not.toContain('PEIXE');
  expect(texts).not.toContain('CARNE');
  expect(texts).not.toContain('SOBREMESA DO DIA');
  await expect(page.getByTestId('btn-pdf')).toBeEnabled();

  // Add many long dishes until it cannot fit
  await tab(page, 'Pratos guardados');
  for (let i = 1; i <= 16; i++) {
    await createDish(page, `Prato de prova número ${i} com um nome comprido para testar a quebra de linha`, 'carne', '12');
  }
  await tab(page, 'Menu do dia');
  await page.getByTestId('btn-pick').click();
  for (const c of ['Peixe', 'Carne', 'Sobremesa do dia']) {
    await dialog.getByRole('button', { name: c }).click();
    const boxes = dialog.getByRole('checkbox');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
  }
  await dialog.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByTestId('overflow-warning')).toBeVisible();
  await expect(page.getByTestId('btn-pdf')).toBeDisabled();
  await expect(page.getByTestId('btn-png')).toBeDisabled();
  await expect(page.getByTestId('btn-print')).toBeDisabled();

  // Removing dishes resolves it
  const removeButtons = page.getByRole('button', { name: /^Remover Prato de prova/ });
  while (await page.getByTestId('overflow-warning').isVisible()) {
    await removeButtons.first().click();
  }
  await expect(page.getByTestId('btn-pdf')).toBeEnabled();
  texts = await previewTexts(page);
  expect(texts.filter((t) => t.endsWith('€')).length).toBeGreaterThan(20);
});

test('PDF and PNG exports are produced with descriptive names', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await tab(page, 'Histórico');
  await page.getByRole('button', { name: 'Abrir' }).click();
  await expect(page.locator('#menu-preview')).toBeVisible();
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-pdf').click()]);
  expect(pdf.suggestedFilename()).toBe('osatelite-menu-2026-09-06.pdf');
  await pdf.saveAs(path.join(OUT_DIR, pdf.suggestedFilename()));
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-png').click()]);
  expect(png.suggestedFilename()).toBe('osatelite-menu-2026-09-06.png');
  await png.saveAs(path.join(OUT_DIR, png.suggestedFilename()));
  expect(fs.statSync(path.join(OUT_DIR, 'osatelite-menu-2026-09-06.pdf')).size).toBeGreaterThan(10_000);
  expect(fs.statSync(path.join(OUT_DIR, 'osatelite-menu-2026-09-06.png')).size).toBeGreaterThan(50_000);

  // Print media shows only the sheet
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.app')).toBeHidden();
  await expect(page.locator('.print-sheet svg')).toBeVisible();
  await page.pdf({ path: path.join(OUT_DIR, 'print-preview.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop.png'), fullPage: false });
});

test('backup export and validated restore', async ({ page }) => {
  await tab(page, 'Definições');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export-backup').click()]);
  expect(dl.suggestedFilename()).toMatch(/^osatelite-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = path.join(OUT_DIR, 'backup.json');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await dl.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(backup.dishes).toHaveLength(27);
  expect(backup.menus).toHaveLength(1);

  // Invalid file is refused without changes
  await page.getByTestId('input-import-backup').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"x"}') });
  await expect(page.getByTestId('backup-invalid')).toBeVisible();

  // Merge only adds what is missing
  backup.dishes.push({ ...backup.dishes[0], id: 'c0000000-0000-4000-8000-000000000001', name: 'Prato Importado' });
  backup.menus.push({ ...backup.menus[0], id: 'd0000000-0000-4000-8000-000000000001', date: '2026-01-05' });
  await page.getByTestId('input-import-backup').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole('dialog', { name: 'Restaurar cópia de segurança' })).toContainText('1 pratos, 1 menus');
  await page.getByTestId('btn-restore').click();
  await tab(page, 'Pratos guardados');
  await expect(page.getByTestId('dish-list').locator('li')).toHaveCount(28);
  await tab(page, 'Histórico');
  await expect(page.getByTestId('menu-list').getByText('05-01-2026', { exact: true })).toBeVisible();

  // Replace requires typing the confirmation word
  await tab(page, 'Definições');
  await page.getByTestId('input-import-backup').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...backup, dishes: backup.dishes.slice(0, 3), menus: [] })) });
  await page.getByRole('radio', { name: /Substituir tudo/ }).check();
  await expect(page.getByTestId('btn-restore')).toBeDisabled();
  await page.getByTestId('confirm-replace').fill('SUBSTITUIR');
  await page.getByTestId('btn-restore').click();
  await tab(page, 'Pratos guardados');
  await expect(page.getByTestId('dish-list').locator('li')).toHaveCount(3);
});

test('template settings live in the settings area and affect the preview', async ({ page }) => {
  await tab(page, 'Definições');
  await page.getByLabel('Linha 3 do rodapé').fill('Aceitamos MB Way');
  await page.getByRole('button', { name: 'Guardar definições' }).click();
  await tab(page, 'Histórico');
  await page.getByRole('button', { name: 'Abrir' }).click();
  expect(await previewTexts(page)).toContain('Aceitamos MB Way');
  await tab(page, 'Definições');
  await page.getByRole('button', { name: 'Repor predefinições' }).click();
  await page.getByRole('button', { name: 'Guardar definições' }).click();
  await tab(page, 'Menu do dia');
  expect(await previewTexts(page)).toContain('Não temos Multibanco');
});
