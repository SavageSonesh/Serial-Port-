import { describe, expect, it } from 'vitest';
import { buildBackup, planMerge, validateBackup } from './backup';
import { SEED_DISHES, SEED_MENU } from './seed';
import { DEFAULT_SETTINGS } from './types';

describe('backup', () => {
  it('round-trips a valid backup', () => {
    const text = JSON.stringify(buildBackup(SEED_DISHES, [SEED_MENU], DEFAULT_SETTINGS));
    const v = validateBackup(text);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.summary.dishes).toBe(27);
      expect(v.summary.menus).toBe(1);
      expect(v.summary.firstMenuDate).toBe('2026-09-06');
    }
  });
  it('rejects malformed files without throwing', () => {
    expect(validateBackup('not json').ok).toBe(false);
    expect(validateBackup('{"format":"other"}').ok).toBe(false);
    const bad = buildBackup([{ ...SEED_DISHES[0], defaultPriceCents: 12.5 }], [], DEFAULT_SETTINGS);
    const v = validateBackup(JSON.stringify(bad));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0]).toMatch(/defaultPriceCents/);
  });
  it('rejects duplicate menu dates inside the file', () => {
    const v = validateBackup(JSON.stringify(buildBackup([], [SEED_MENU, { ...SEED_MENU, id: 'x' }], DEFAULT_SETTINGS)));
    expect(v.ok).toBe(false);
  });
  it('merge plan never overwrites existing records', () => {
    const backup = buildBackup(SEED_DISHES, [SEED_MENU, { ...SEED_MENU, id: 'new', date: '2026-09-07' }], DEFAULT_SETTINGS);
    const plan = planMerge(backup, SEED_DISHES.slice(0, 5), [SEED_MENU]);
    expect(plan.dishesToAdd).toHaveLength(22);
    expect(plan.skippedDishes).toBe(5);
    expect(plan.menusToAdd.map((m) => m.date)).toEqual(['2026-09-07']);
    expect(plan.skippedMenus).toBe(1);
  });
});
