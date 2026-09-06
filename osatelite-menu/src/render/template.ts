/**
 * Fixed printed template (A4 portrait, millimetres). Calibrated against the
 * reference photo: left column at 21 mm, prices right-aligned at 188 mm, title
 * baseline at 15.3 mm, 7.5 mm row pitch, logo bottom-right, footer bottom-left.
 * These values are deliberately not user-editable.
 */
export const PAGE = { width: 210, height: 297 } as const;

export const PT_TO_MM = 25.4 / 72;

export const TEMPLATE = {
  fontFamily: 'MenuSans',
  left: 21,
  priceRight: 188,
  /** Minimum horizontal gap between a dish name and its price. */
  namePriceGap: 6,
  titleBaseline: 15.3,
  titleSizePt: 18,
  headingSizePt: 16,
  footer: {
    centreX: 61.4,
    firstBaseline: 271,
    pitch: 4.5,
    sizePt: 9,
    dateBaseline: 286,
    dateSizePt: 10,
  },
  logo: {
    right: 195,
    width: 103,
    centreY: 273.5,
  },
  /** Dishes must end (including descenders) above this line so nothing touches the footer/logo. */
  contentBottomLimit: 260,
} as const;

export interface SpacingTier {
  name: string;
  itemPitch: number;
  /** Baseline distance from the previous line to a category heading. */
  headingBefore: number;
  /** Baseline distance from a heading to its first item. */
  headingAfter: number;
  itemSizePt: number;
  headingSizePt: number;
  /** Shown in the interface when this tier is in use (null = normal). */
  notice: string | null;
}

/**
 * Controlled spacing adjustments, tried in order until the content fits.
 * Font size is only reduced in the last tier, and never below 14 pt.
 */
export const SPACING_TIERS: SpacingTier[] = [
  { name: 'normal', itemPitch: 7.5, headingBefore: 11.0, headingAfter: 7.7, itemSizePt: 15, headingSizePt: 16, notice: null },
  { name: 'compact-1', itemPitch: 7.0, headingBefore: 10.2, headingAfter: 7.2, itemSizePt: 15, headingSizePt: 16, notice: 'Espaçamento ligeiramente reduzido para caber na página.' },
  { name: 'compact-2', itemPitch: 6.5, headingBefore: 9.4, headingAfter: 6.7, itemSizePt: 15, headingSizePt: 16, notice: 'Espaçamento reduzido para caber na página.' },
  { name: 'compact-3', itemPitch: 6.2, headingBefore: 8.8, headingAfter: 6.4, itemSizePt: 14, headingSizePt: 15, notice: 'Espaçamento e tamanho de letra reduzidos (14 pt) para caber na página.' },
];
