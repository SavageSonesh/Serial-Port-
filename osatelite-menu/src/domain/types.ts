export type Category = 'sopa' | 'peixe' | 'carne' | 'vegetariano' | 'sobremesa';

/** A dish in the permanent catalogue. */
export interface Dish {
  id: string;
  name: string;
  category: Category;
  /** Default price stored as integer cents (e.g. 1350 = 13,50€). */
  defaultPriceCents: number;
  /** Optional serving information, e.g. "2 PESSOAS". */
  servingInfo: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Snapshot of a dish inside a daily menu. Copied at selection time so later
 * catalogue edits never alter a historical menu. Order = array order.
 */
export interface MenuItem {
  dishId: string | null;
  name: string;
  category: Category;
  priceCents: number;
  servingInfo: string | null;
}

export interface DailyMenu {
  id: string;
  /** ISO calendar date, YYYY-MM-DD, in the Europe/Lisbon calendar. */
  date: string;
  items: MenuItem[];
  createdAt: string;
  updatedAt: string;
}

/** Fixed printed-template settings. Only editable in the settings area. */
export interface TemplateSettings {
  title: string;
  footerLines: string[];
  uppercaseNames: boolean;
  logoGrayscale: boolean;
}

export const DEFAULT_SETTINGS: TemplateSettings = {
  title: 'PRATOS DO DIA',
  footerLines: ['Os preços têm IVA à taxa legal', 'Há livro de reclamações', 'Não temos Multibanco'],
  uppercaseNames: true,
  logoGrayscale: false,
};

export interface BackupFile {
  format: 'osatelite-menu-backup';
  version: 1;
  exportedAt: string;
  dishes: Dish[];
  menus: DailyMenu[];
  settings: TemplateSettings;
}
