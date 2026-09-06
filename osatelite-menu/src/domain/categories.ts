import type { Category } from './types';

/** Fixed category order of the printed template. */
export const CATEGORY_ORDER: Category[] = ['sopa', 'peixe', 'carne', 'vegetariano', 'sobremesa'];

/** Heading printed on the menu (null = printed without heading, directly under the title). */
export const CATEGORY_HEADING: Record<Category, string | null> = {
  sopa: null,
  peixe: 'PEIXE',
  carne: 'CARNE',
  vegetariano: 'VEGETARIANO',
  sobremesa: 'SOBREMESA DO DIA',
};

/** Label used in the application interface. */
export const CATEGORY_LABEL: Record<Category, string> = {
  sopa: 'Sopa',
  peixe: 'Peixe',
  carne: 'Carne',
  vegetariano: 'Vegetariano',
  sobremesa: 'Sobremesa do dia',
};

export function isCategory(v: unknown): v is Category {
  return typeof v === 'string' && (CATEGORY_ORDER as string[]).includes(v);
}

export function categoryIndex(c: Category): number {
  return CATEGORY_ORDER.indexOf(c);
}
