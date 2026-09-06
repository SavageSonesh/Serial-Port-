import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BackupFile, DailyMenu, Dish, MenuItem, TemplateSettings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { AuthUser, StorageAdapter } from './adapter';

interface DishRow {
  id: string;
  name: string;
  category: Dish['category'];
  default_price_cents: number;
  serving_info: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

interface MenuRow {
  id: string;
  menu_date: string;
  items: MenuItem[];
  created_at: string;
  updated_at: string;
}

const toDish = (r: DishRow): Dish => ({
  id: r.id,
  name: r.name,
  category: r.category,
  defaultPriceCents: r.default_price_cents,
  servingInfo: r.serving_info,
  archived: r.archived,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const fromDish = (d: Dish): DishRow => ({
  id: d.id,
  name: d.name,
  category: d.category,
  default_price_cents: d.defaultPriceCents,
  serving_info: d.servingInfo,
  archived: d.archived,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
});

const toMenu = (r: MenuRow): DailyMenu => ({
  id: r.id,
  date: r.menu_date,
  items: r.items,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const fromMenu = (m: DailyMenu): MenuRow => ({
  id: m.id,
  menu_date: m.date,
  items: m.items,
  created_at: m.createdAt,
  updated_at: m.updatedAt,
});

function fail(context: string, error: { message: string; code?: string } | null): never {
  const msg = error?.message ?? 'erro desconhecido';
  if (error?.code === '42501' || /row-level security/i.test(msg)) {
    throw new Error(`${context}: sem permissão. O seu e-mail não está na lista de utilizadores autorizados.`);
  }
  throw new Error(`${context}: ${msg}`);
}

/** Shared Postgres database with authentication (Supabase). */
export class SupabaseAdapter implements StorageAdapter {
  readonly kind = 'supabase' as const;
  readonly label = 'Base de dados partilhada';
  readonly requiresAuth = true;
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  }

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.client.auth.getSession();
    const email = data.session?.user.email;
    return email ? { email } : null;
  }
  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou palavra-passe incorretos.' : error.message);
  }
  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }
  async changePassword(newPassword: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }
  onAuthChange(cb: (user: AuthUser | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_evt, session) => {
      const email = session?.user.email;
      cb(email ? { email } : null);
    });
    return () => data.subscription.unsubscribe();
  }

  async listDishes(): Promise<Dish[]> {
    const { data, error } = await this.client.from('dishes').select('*').order('created_at');
    if (error) fail('Ler pratos', error);
    return (data as DishRow[]).map(toDish);
  }
  async upsertDish(dish: Dish): Promise<Dish> {
    const { data, error } = await this.client.from('dishes').upsert(fromDish(dish)).select().single();
    if (error) fail('Guardar prato', error);
    return toDish(data as DishRow);
  }

  async listMenus(): Promise<DailyMenu[]> {
    const { data, error } = await this.client.from('menus').select('*').order('menu_date', { ascending: false });
    if (error) fail('Ler menus', error);
    return (data as MenuRow[]).map(toMenu);
  }
  async upsertMenu(menu: DailyMenu): Promise<DailyMenu> {
    const { data, error } = await this.client.from('menus').upsert(fromMenu(menu)).select().single();
    if (error) {
      if (error.code === '23505') throw new Error(`Já existe outro menu para ${menu.date}.`);
      fail('Guardar menu', error);
    }
    return toMenu(data as MenuRow);
  }
  async deleteMenu(id: string): Promise<void> {
    const { error } = await this.client.from('menus').delete().eq('id', id);
    if (error) fail('Apagar menu', error);
  }

  async getSettings(): Promise<TemplateSettings> {
    const { data, error } = await this.client.from('settings').select('data').eq('id', 'template').maybeSingle();
    if (error) fail('Ler definições', error);
    return { ...DEFAULT_SETTINGS, ...((data?.data as Partial<TemplateSettings>) ?? {}) };
  }
  async saveSettings(settings: TemplateSettings): Promise<TemplateSettings> {
    const { error } = await this.client
      .from('settings')
      .upsert({ id: 'template', data: settings, updated_at: new Date().toISOString() });
    if (error) fail('Guardar definições', error);
    return settings;
  }

  async addRecords(dishes: Dish[], menus: DailyMenu[]): Promise<void> {
    if (dishes.length) {
      const { error } = await this.client.from('dishes').upsert(dishes.map(fromDish), { ignoreDuplicates: true });
      if (error) fail('Importar pratos', error);
    }
    if (menus.length) {
      const { error } = await this.client.from('menus').upsert(menus.map(fromMenu), { ignoreDuplicates: true });
      if (error) fail('Importar menus', error);
    }
  }
  async replaceAll(backup: BackupFile): Promise<void> {
    const { error } = await this.client.rpc('replace_all_data', {
      p_dishes: backup.dishes.map(fromDish),
      p_menus: backup.menus.map(fromMenu),
      p_settings: backup.settings,
    });
    if (error) fail('Substituir dados', error);
  }
}
