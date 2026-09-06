import type { DailyMenu, MenuItem, TemplateSettings } from '../domain/types';
import { CATEGORY_HEADING, CATEGORY_ORDER } from '../domain/categories';
import { formatEuro } from '../domain/money';
import { formatDatePt } from '../domain/dates';
import type { Fonts, Weight } from './fonts';
import { PAGE, SPACING_TIERS, TEMPLATE, type SpacingTier } from './template';

/** A positioned run of text. `x` is the left edge and `y` the baseline, both in millimetres. */
export interface TextRun {
  kind: 'title' | 'heading' | 'name' | 'price' | 'footer' | 'date';
  text: string;
  x: number;
  y: number;
  sizePt: number;
  weight: Weight;
}

export interface ImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  grayscale: boolean;
}

export interface Layout {
  page: { width: number; height: number };
  texts: TextRun[];
  logo: ImagePlacement;
  tier: SpacingTier;
  /** True when the dishes cannot fit legibly on one page. Exports must be blocked. */
  overflow: boolean;
  /** Lowest point (mm) reached by dish content, including descenders. */
  contentBottom: number;
  /** Number of printed dish lines (wrapped names count more than once). */
  lineCount: number;
}

const DESCENDER = 0.3; // Open Sans descender ≈ 0.29 em

export interface LayoutInput {
  menu: DailyMenu;
  settings: TemplateSettings;
  logoAspect: number; // width / height of the logo asset
}

function displayName(item: MenuItem, upper: boolean): string {
  const serving = item.servingInfo?.trim();
  const base = serving ? `${item.name.trim()} (${serving})` : item.name.trim();
  return upper ? base.toLocaleUpperCase('pt-PT') : base;
}

/** Greedy word wrap using the real font metrics; over-long words are split by character. */
export function wrapText(text: string, maxWidth: number, sizePt: number, weight: Weight, fonts: Fonts): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  const fits = (s: string) => fonts.measure(s, sizePt, weight) <= maxWidth;
  const pushWord = (word: string) => {
    if (fits(word)) {
      current = word;
      return;
    }
    let chunk = '';
    for (const ch of word) {
      if (fits(chunk + ch)) chunk += ch;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    current = chunk;
  };
  for (const word of words) {
    if (!current) {
      pushWord(word);
      continue;
    }
    const candidate = `${current} ${word}`;
    if (fits(candidate)) current = candidate;
    else {
      lines.push(current);
      pushWord(word);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function layoutWithTier(input: LayoutInput, fonts: Fonts, tier: SpacingTier): Layout {
  const { menu, settings } = input;
  const texts: TextRun[] = [];
  const centre = (TEMPLATE.left + TEMPLATE.priceRight) / 2;

  // Title
  const titleW = fonts.measure(settings.title, TEMPLATE.titleSizePt, 'bold');
  texts.push({ kind: 'title', text: settings.title, x: centre - titleW / 2, y: TEMPLATE.titleBaseline, sizePt: TEMPLATE.titleSizePt, weight: 'bold' });

  let y = TEMPLATE.titleBaseline;
  let lastKind: 'title' | 'heading' | 'item' = 'title';
  let contentBottom = TEMPLATE.titleBaseline + TEMPLATE.titleSizePt * (25.4 / 72) * DESCENDER;
  let lineCount = 0;

  for (const category of CATEGORY_ORDER) {
    const items = menu.items.filter((i) => i.category === category);
    if (items.length === 0) continue; // empty categories are hidden completely
    const heading = CATEGORY_HEADING[category];
    if (heading) {
      y += tier.headingBefore;
      const w = fonts.measure(heading, tier.headingSizePt, 'bold');
      texts.push({ kind: 'heading', text: heading, x: centre - w / 2, y, sizePt: tier.headingSizePt, weight: 'bold' });
      lastKind = 'heading';
    }
    for (const item of items) {
      y += lastKind === 'heading' ? tier.headingAfter : lastKind === 'title' ? tier.headingBefore : tier.itemPitch;
      lastKind = 'item';
      const price = formatEuro(item.priceCents);
      const priceW = fonts.measure(price, tier.itemSizePt, 'regular');
      const priceX = TEMPLATE.priceRight - priceW;
      const maxNameW = priceX - TEMPLATE.namePriceGap - TEMPLATE.left;
      const lines = wrapText(displayName(item, settings.uppercaseNames), maxNameW, tier.itemSizePt, 'regular', fonts);
      texts.push({ kind: 'price', text: price, x: priceX, y, sizePt: tier.itemSizePt, weight: 'regular' });
      lines.forEach((line, i) => {
        if (i > 0) y += tier.itemPitch;
        texts.push({ kind: 'name', text: line, x: TEMPLATE.left, y, sizePt: tier.itemSizePt, weight: 'regular' });
        lineCount++;
      });
      contentBottom = y + tier.itemSizePt * (25.4 / 72) * DESCENDER;
    }
  }

  // Footer (fixed)
  settings.footerLines.forEach((line, i) => {
    const w = fonts.measure(line, TEMPLATE.footer.sizePt, 'regular');
    texts.push({
      kind: 'footer',
      text: line,
      x: TEMPLATE.footer.centreX - w / 2,
      y: TEMPLATE.footer.firstBaseline + i * TEMPLATE.footer.pitch,
      sizePt: TEMPLATE.footer.sizePt,
      weight: 'regular',
    });
  });
  const dateText = formatDatePt(menu.date);
  const dateW = fonts.measure(dateText, TEMPLATE.footer.dateSizePt, 'bold');
  texts.push({ kind: 'date', text: dateText, x: TEMPLATE.footer.centreX - dateW / 2, y: TEMPLATE.footer.dateBaseline, sizePt: TEMPLATE.footer.dateSizePt, weight: 'bold' });

  const logoH = TEMPLATE.logo.width / input.logoAspect;
  const logo: ImagePlacement = {
    x: TEMPLATE.logo.right - TEMPLATE.logo.width,
    y: TEMPLATE.logo.centreY - logoH / 2,
    width: TEMPLATE.logo.width,
    height: logoH,
    grayscale: settings.logoGrayscale,
  };

  return {
    page: { width: PAGE.width, height: PAGE.height },
    texts,
    logo,
    tier,
    overflow: contentBottom > TEMPLATE.contentBottomLimit,
    contentBottom,
    lineCount,
  };
}

/**
 * Lays out a menu on the fixed A4 template. Tries each spacing tier in order
 * and returns the first that fits; if none fits, returns the last tier with
 * `overflow: true` so the interface can warn and block exports.
 */
export function layoutMenu(input: LayoutInput, fonts: Fonts): Layout {
  let last: Layout | null = null;
  for (const tier of SPACING_TIERS) {
    last = layoutWithTier(input, fonts, tier);
    if (!last.overflow) return last;
  }
  return last!;
}
