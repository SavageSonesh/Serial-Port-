import { describe, expect, it } from 'vitest';
import { SEED_DISHES, SEED_MENU } from './seed';
import { addDishToMenu, duplicateMenu, findLikelyDuplicates, moveWithinCategory, normaliseName, removeDishFromMenu, snapshotDish } from './menuOps';

describe('menu operations', () => {
  it('seed catalogue matches the reference menu', () => {
    expect(SEED_DISHES).toHaveLength(27);
    expect(SEED_MENU.items).toHaveLength(27);
    expect(SEED_DISHES.find((d) => d.name === 'Lula Grande dos Açores Grelhada')?.servingInfo).toBe('2 PESSOAS');
    expect(SEED_DISHES.filter((d) => d.category === 'peixe')).toHaveLength(11);
    expect(SEED_DISHES.filter((d) => d.category === 'carne')).toHaveLength(7);
    expect(SEED_DISHES.filter((d) => d.category === 'sobremesa')).toHaveLength(7);
  });
  it('snapshots keep values independent of later catalogue edits', () => {
    const dish = { ...SEED_DISHES[0] };
    const item = snapshotDish(dish);
    dish.name = 'Outra coisa';
    dish.defaultPriceCents = 999;
    expect(item.name).toBe('Canja de Galinha');
    expect(item.priceCents).toBe(200);
  });
  it('duplicates with a new date and copies items', () => {
    const copy = duplicateMenu(SEED_MENU, '2026-09-07');
    expect(copy.id).not.toBe(SEED_MENU.id);
    expect(copy.date).toBe('2026-09-07');
    expect(copy.items).toEqual(SEED_MENU.items);
    expect(copy.items[0]).not.toBe(SEED_MENU.items[0]);
  });
  it('reorders only inside a category', () => {
    const items = SEED_MENU.items;
    const moved = moveWithinCategory(items, 'peixe', 0, 2);
    const fish = moved.filter((i) => i.category === 'peixe').map((i) => i.name);
    expect(fish.slice(0, 3)).toEqual(['Arroz de Gambas', 'Sardinhas Assadas', 'Polvo à Lagareiro']);
    expect(moved.filter((i) => i.category !== 'peixe')).toEqual(items.filter((i) => i.category !== 'peixe'));
    expect(moveWithinCategory(items, 'peixe', 0, 99)).toBe(items);
  });
  it('adds once and removes without touching the catalogue', () => {
    const menu = { ...SEED_MENU, items: [] };
    const withDish = addDishToMenu(menu, SEED_DISHES[3]);
    expect(addDishToMenu(withDish, SEED_DISHES[3]).items).toHaveLength(1);
    expect(removeDishFromMenu(withDish, 0).items).toHaveLength(0);
    expect(SEED_DISHES[3].archived).toBe(false);
  });
  it('detects likely duplicates ignoring case, accents and spacing', () => {
    expect(normaliseName('  MELÃO ')).toBe('melao');
    expect(findLikelyDuplicates(SEED_DISHES, 'melao')).toHaveLength(1);
    expect(findLikelyDuplicates(SEED_DISHES, 'Polvo  à  lagareiro')).toHaveLength(1);
    expect(findLikelyDuplicates(SEED_DISHES, 'Melão', SEED_DISHES.find((d) => d.name === 'Melão')!.id)).toHaveLength(0);
    expect(findLikelyDuplicates(SEED_DISHES, 'Bacalhau')).toHaveLength(0);
  });
});
