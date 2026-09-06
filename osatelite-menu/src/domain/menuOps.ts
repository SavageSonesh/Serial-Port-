import type { Category, DailyMenu, Dish, MenuItem } from './types';
import { categoryIndex } from './categories';

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Snapshot a catalogue dish into a menu item using the catalogue default price. */
export function snapshotDish(dish: Dish): MenuItem {
  return {
    dishId: dish.id,
    name: dish.name,
    category: dish.category,
    priceCents: dish.defaultPriceCents,
    servingInfo: dish.servingInfo,
  };
}

/** Stable sort by fixed category order; relative order inside a category is preserved. */
export function sortByCategory(items: MenuItem[]): MenuItem[] {
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => categoryIndex(a.it.category) - categoryIndex(b.it.category) || a.i - b.i)
    .map((x) => x.it);
}

export function itemsOf(menu: DailyMenu, category: Category): MenuItem[] {
  return menu.items.filter((i) => i.category === category);
}

/** Moves the item at position `from` to position `to` inside one category. */
export function moveWithinCategory(items: MenuItem[], category: Category, from: number, to: number): MenuItem[] {
  const group = items.filter((i) => i.category === category);
  if (from < 0 || from >= group.length || to < 0 || to >= group.length || from === to) return items;
  const reordered = group.slice();
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  let k = 0;
  return items.map((i) => (i.category === category ? reordered[k++] : i));
}

export function createMenu(date: string, items: MenuItem[] = []): DailyMenu {
  const t = nowIso();
  return { id: newId(), date, items: sortByCategory(items), createdAt: t, updatedAt: t };
}

/** Deep copy of a menu's items for a new date; snapshots are kept as they were. */
export function duplicateMenu(source: DailyMenu, date: string): DailyMenu {
  return createMenu(
    date,
    source.items.map((i) => ({ ...i })),
  );
}

export function addDishToMenu(menu: DailyMenu, dish: Dish): DailyMenu {
  if (menu.items.some((i) => i.dishId === dish.id)) return menu;
  return { ...menu, items: sortByCategory([...menu.items, snapshotDish(dish)]) };
}

export function removeDishFromMenu(menu: DailyMenu, index: number): DailyMenu {
  return { ...menu, items: menu.items.filter((_, i) => i !== index) };
}

/** Normalises a dish name for duplicate detection: case, accents and spacing insensitive. */
export function normaliseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function findLikelyDuplicates(dishes: Dish[], name: string, excludeId?: string): Dish[] {
  const key = normaliseName(name);
  if (!key) return [];
  return dishes.filter((d) => d.id !== excludeId && normaliseName(d.name) === key);
}
