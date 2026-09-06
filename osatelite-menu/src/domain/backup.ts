import { z } from 'zod';
import type { BackupFile, DailyMenu, Dish, TemplateSettings } from './types';
import { CATEGORY_ORDER } from './categories';
import { isIsoDate } from './dates';

const categorySchema = z.enum(CATEGORY_ORDER as [string, ...string[]]);
const isoDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'data/hora inválida');
const cents = z.number().int().nonnegative();

const dishSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  category: categorySchema,
  defaultPriceCents: cents,
  servingInfo: z.string().nullable(),
  archived: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

const menuItemSchema = z.object({
  dishId: z.string().nullable(),
  name: z.string().trim().min(1),
  category: categorySchema,
  priceCents: cents,
  servingInfo: z.string().nullable(),
});

const menuSchema = z.object({
  id: z.string().min(1),
  date: z.string().refine(isIsoDate, 'data inválida (esperado AAAA-MM-DD)'),
  items: z.array(menuItemSchema),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const settingsSchema = z.object({
  title: z.string().min(1),
  footerLines: z.array(z.string()).max(6),
  uppercaseNames: z.boolean(),
  logoGrayscale: z.boolean(),
});

export const backupSchema = z.object({
  format: z.literal('osatelite-menu-backup'),
  version: z.literal(1),
  exportedAt: isoDateTime,
  dishes: z.array(dishSchema),
  menus: z.array(menuSchema),
  settings: settingsSchema,
});

export function buildBackup(dishes: Dish[], menus: DailyMenu[], settings: TemplateSettings): BackupFile {
  return { format: 'osatelite-menu-backup', version: 1, exportedAt: new Date().toISOString(), dishes, menus, settings };
}

export type BackupValidation =
  | { ok: true; backup: BackupFile; summary: BackupSummary }
  | { ok: false; errors: string[] };

export interface BackupSummary {
  dishes: number;
  archivedDishes: number;
  menus: number;
  firstMenuDate: string | null;
  lastMenuDate: string | null;
  exportedAt: string;
}

/** Validates raw JSON text. Never touches stored data. */
export function validateBackup(text: string): BackupValidation {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['O ficheiro não é JSON válido.'] };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.slice(0, 12).map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`);
    return { ok: false, errors };
  }
  const backup = parsed.data as BackupFile;
  const ids = new Set<string>();
  const dates = new Set<string>();
  const errors: string[] = [];
  for (const d of backup.dishes) {
    if (ids.has(d.id)) errors.push(`Prato com ID repetido: ${d.id}`);
    ids.add(d.id);
  }
  for (const m of backup.menus) {
    if (dates.has(m.date)) errors.push(`Existem dois menus para a data ${m.date} no ficheiro.`);
    dates.add(m.date);
  }
  if (errors.length) return { ok: false, errors };
  const sortedDates = [...dates].sort();
  return {
    ok: true,
    backup,
    summary: {
      dishes: backup.dishes.length,
      archivedDishes: backup.dishes.filter((d) => d.archived).length,
      menus: backup.menus.length,
      firstMenuDate: sortedDates[0] ?? null,
      lastMenuDate: sortedDates[sortedDates.length - 1] ?? null,
      exportedAt: backup.exportedAt,
    },
  };
}

export type RestoreMode = 'merge' | 'replace';

export interface MergePlan {
  dishesToAdd: Dish[];
  menusToAdd: DailyMenu[];
  skippedDishes: number;
  skippedMenus: number;
}

/** Merge = only add dishes whose ID is unknown and menus whose date is unused. Nothing is overwritten. */
export function planMerge(backup: BackupFile, existingDishes: Dish[], existingMenus: DailyMenu[]): MergePlan {
  const ids = new Set(existingDishes.map((d) => d.id));
  const dates = new Set(existingMenus.map((m) => m.date));
  const menuIds = new Set(existingMenus.map((m) => m.id));
  const dishesToAdd = backup.dishes.filter((d) => !ids.has(d.id));
  const menusToAdd = backup.menus.filter((m) => !dates.has(m.date) && !menuIds.has(m.id));
  return {
    dishesToAdd,
    menusToAdd,
    skippedDishes: backup.dishes.length - dishesToAdd.length,
    skippedMenus: backup.menus.length - menusToAdd.length,
  };
}
