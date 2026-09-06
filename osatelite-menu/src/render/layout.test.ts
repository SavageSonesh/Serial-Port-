import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fontsFromBytes } from './fonts';
import { layoutMenu, wrapText } from './layout';
import { SEED_DISHES, SEED_MENU } from '../domain/seed';
import { DEFAULT_SETTINGS, type DailyMenu, type MenuItem } from '../domain/types';
import { TEMPLATE } from './template';
import { snapshotDish } from '../domain/menuOps';

const toAB = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const fonts = fontsFromBytes(toAB(fs.readFileSync('public/fonts/OpenSans-Regular.ttf')), toAB(fs.readFileSync('public/fonts/OpenSans-Bold.ttf')));
const LOGO_ASPECT = 868 / 195;
const lay = (menu: DailyMenu, settings = DEFAULT_SETTINGS) => layoutMenu({ menu, settings, logoAspect: LOGO_ASPECT }, fonts);

describe('layout engine', () => {
  it('reproduces the reference structure', () => {
    const l = lay(SEED_MENU);
    const texts = l.texts.map((t) => t.text);
    expect(texts[0]).toBe('PRATOS DO DIA');
    expect(texts.filter((t) => ['PEIXE', 'CARNE', 'VEGETARIANO', 'SOBREMESA DO DIA'].includes(t))).toHaveLength(4);
    expect(texts).not.toContain('SOPA');
    expect(texts).toContain('CANJA DE GALINHA');
    expect(texts).toContain('LULA GRANDE DOS AÇORES GRELHADA (2 PESSOAS)');
    expect(texts).toContain('HAMBÚRGUER GRELHADO COM BATATA E ARROZ');
    expect(texts).toContain('13,50€');
    expect(texts).toContain('06-09-2026');
    expect(texts).toContain('Não temos Multibanco');
    expect(l.overflow).toBe(false);
    // soup comes right after the title, before PEIXE
    expect(texts.indexOf('CANJA DE GALINHA')).toBeLessThan(texts.indexOf('PEIXE'));
  });
  it('right-aligns every price exactly at the price column', () => {
    const l = lay(SEED_MENU);
    for (const t of l.texts.filter((t) => t.kind === 'price')) {
      const right = t.x + fonts.measure(t.text, t.sizePt, t.weight);
      expect(Math.abs(right - TEMPLATE.priceRight)).toBeLessThan(0.01);
    }
  });
  it('keeps dishes above the footer and logo', () => {
    const l = lay(SEED_MENU);
    expect(l.contentBottom).toBeLessThanOrEqual(TEMPLATE.contentBottomLimit);
    expect(l.contentBottom).toBeLessThan(l.logo.y);
    expect(l.logo.x + l.logo.width).toBeCloseTo(TEMPLATE.logo.right, 5);
  });
  it('hides empty categories', () => {
    const menu: DailyMenu = { ...SEED_MENU, items: SEED_MENU.items.filter((i) => i.category === 'carne') };
    const texts = lay(menu).texts.map((t) => t.text);
    expect(texts).toContain('CARNE');
    expect(texts).not.toContain('PEIXE');
    expect(texts).not.toContain('VEGETARIANO');
    expect(texts).not.toContain('SOBREMESA DO DIA');
  });
  it('wraps long names so they never collide with the price', () => {
    const long: MenuItem = { dishId: null, name: 'Bacalhau à Brás com batata palha, azeitonas pretas, salsa fresca e ovo caseiro da quinta', category: 'peixe', priceCents: 1450, servingInfo: null };
    const menu: DailyMenu = { ...SEED_MENU, items: [long] };
    const l = lay(menu);
    const names = l.texts.filter((t) => t.kind === 'name');
    expect(names.length).toBeGreaterThan(1);
    const price = l.texts.find((t) => t.kind === 'price')!;
    for (const n of names) {
      expect(n.x + fonts.measure(n.text, n.sizePt, n.weight)).toBeLessThanOrEqual(price.x - TEMPLATE.namePriceGap + 0.01);
    }
    expect(names.map((n) => n.text).join(' ')).toBe(long.name.toLocaleUpperCase('pt-PT'));
    expect(wrapText('Supercalifragilisticexpialidocious'.repeat(3), 40, 15, 'regular', fonts).length).toBeGreaterThan(1);
  });
  it('uses controlled spacing tiers and blocks when too many dishes', () => {
    const many = (n: number): DailyMenu => ({
      ...SEED_MENU,
      items: Array.from({ length: n }, (_, i) => ({ ...snapshotDish(SEED_DISHES[i % SEED_DISHES.length]), name: `Prato ${i}` })),
    });
    expect(lay(many(20)).tier.name).toBe('normal');
    expect(lay(SEED_MENU).tier.name).not.toBe('normal'); // reference (27 dishes) needs compact spacing to clear the footer
    expect(lay(SEED_MENU).tier.itemSizePt).toBe(15);
    const huge = lay(many(45));
    expect(huge.overflow).toBe(true);
    expect(huge.tier.itemSizePt).toBeGreaterThanOrEqual(14);
  });
  it('respects the uppercase setting and custom footer', () => {
    const l = lay(SEED_MENU, { ...DEFAULT_SETTINGS, uppercaseNames: false, footerLines: ['Linha A'] });
    expect(l.texts.map((t) => t.text)).toContain('Canja de Galinha');
    expect(l.texts.filter((t) => t.kind === 'footer').map((t) => t.text)).toEqual(['Linha A']);
  });
});
