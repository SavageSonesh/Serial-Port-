import type { BackupFile, DailyMenu, Dish, TemplateSettings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { SEED_DISHES, SEED_MENU } from '../domain/seed';
import type { AuthUser, StorageAdapter } from './adapter';

const KEY = 'osatelite-menu-demo-v1';

interface LocalData {
  dishes: Dish[];
  menus: DailyMenu[];
  settings: TemplateSettings;
}

/**
 * TEMPORARY LOCAL DEMONSTRATION MODE.
 * Used only when no Supabase configuration is present. Data lives in this
 * browser's localStorage and is NOT shared with other devices.
 */
export class LocalAdapter implements StorageAdapter {
  readonly kind = 'local' as const;
  readonly label = 'Modo de demonstração local (só neste navegador)';
  readonly requiresAuth = false;

  private read(): LocalData {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as LocalData;
    } catch {
      /* fall through to seed */
    }
    const seeded: LocalData = { dishes: SEED_DISHES, menus: [SEED_MENU], settings: DEFAULT_SETTINGS };
    this.write(seeded);
    return seeded;
  }

  private write(data: LocalData) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  async getUser(): Promise<AuthUser | null> {
    return { email: 'demo@local' };
  }
  async signIn(): Promise<void> {}
  async signOut(): Promise<void> {}
  async changePassword(): Promise<void> {
    throw new Error('Não disponível no modo de demonstração.');
  }
  onAuthChange(): () => void {
    return () => {};
  }

  async listDishes(): Promise<Dish[]> {
    return this.read().dishes;
  }
  async upsertDish(dish: Dish): Promise<Dish> {
    const data = this.read();
    const i = data.dishes.findIndex((d) => d.id === dish.id);
    if (i >= 0) data.dishes[i] = dish;
    else data.dishes.push(dish);
    this.write(data);
    return dish;
  }

  async listMenus(): Promise<DailyMenu[]> {
    return this.read().menus;
  }
  async upsertMenu(menu: DailyMenu): Promise<DailyMenu> {
    const data = this.read();
    const clash = data.menus.find((m) => m.date === menu.date && m.id !== menu.id);
    if (clash) throw new Error(`Já existe outro menu para ${menu.date}.`);
    const i = data.menus.findIndex((m) => m.id === menu.id);
    if (i >= 0) data.menus[i] = menu;
    else data.menus.push(menu);
    this.write(data);
    return menu;
  }
  async deleteMenu(id: string): Promise<void> {
    const data = this.read();
    data.menus = data.menus.filter((m) => m.id !== id);
    this.write(data);
  }

  async getSettings(): Promise<TemplateSettings> {
    return { ...DEFAULT_SETTINGS, ...this.read().settings };
  }
  async saveSettings(settings: TemplateSettings): Promise<TemplateSettings> {
    const data = this.read();
    data.settings = settings;
    this.write(data);
    return settings;
  }

  async addRecords(dishes: Dish[], menus: DailyMenu[]): Promise<void> {
    const data = this.read();
    const ids = new Set(data.dishes.map((d) => d.id));
    const dates = new Set(data.menus.map((m) => m.date));
    data.dishes.push(...dishes.filter((d) => !ids.has(d.id)));
    data.menus.push(...menus.filter((m) => !dates.has(m.date)));
    this.write(data);
  }
  async replaceAll(backup: BackupFile): Promise<void> {
    this.write({ dishes: backup.dishes, menus: backup.menus, settings: backup.settings });
  }
}
