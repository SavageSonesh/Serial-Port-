import type { BackupFile, DailyMenu, Dish, TemplateSettings } from '../domain/types';

export interface AuthUser {
  email: string;
}

export interface StorageAdapter {
  readonly kind: 'supabase' | 'local';
  /** Human label shown in the interface. */
  readonly label: string;
  readonly requiresAuth: boolean;

  getUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  changePassword(newPassword: string): Promise<void>;
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;

  listDishes(): Promise<Dish[]>;
  upsertDish(dish: Dish): Promise<Dish>;

  listMenus(): Promise<DailyMenu[]>;
  upsertMenu(menu: DailyMenu): Promise<DailyMenu>;
  deleteMenu(id: string): Promise<void>;

  getSettings(): Promise<TemplateSettings>;
  saveSettings(settings: TemplateSettings): Promise<TemplateSettings>;

  /** Adds records without touching existing ones (used by backup merge). */
  addRecords(dishes: Dish[], menus: DailyMenu[]): Promise<void>;
  /** Replaces everything with the backup contents (used by backup replace, after explicit confirmation). */
  replaceAll(backup: BackupFile): Promise<void>;
}
