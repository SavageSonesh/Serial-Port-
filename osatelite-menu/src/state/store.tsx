import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BackupFile, DailyMenu, Dish, TemplateSettings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { AuthUser, StorageAdapter } from '../storage';
import { nowIso } from '../domain/menuOps';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface StoreState {
  ready: boolean;
  loadError: string | null;
  user: AuthUser | null;
  dishes: Dish[];
  menus: DailyMenu[];
  settings: TemplateSettings;
  currentMenuId: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
}

interface StoreApi extends StoreState {
  storage: StorageAdapter;
  currentMenu: DailyMenu | null;
  reload(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  saveDish(dish: Dish): Promise<void>;
  /** Opens a menu in the editor (existing or new). New menus are persisted immediately. */
  openMenu(menu: DailyMenu): Promise<void>;
  closeMenu(): void;
  /** Edits the open menu; the change is auto-saved shortly afterwards. */
  updateCurrentMenu(update: (m: DailyMenu) => DailyMenu): void;
  deleteMenu(id: string): Promise<void>;
  saveSettings(s: TemplateSettings): Promise<void>;
  mergeBackup(dishes: Dish[], menus: DailyMenu[]): Promise<void>;
  replaceWithBackup(backup: BackupFile): Promise<void>;
}

const StoreContext = createContext<StoreApi | null>(null);

const AUTOSAVE_MS = 600;
/** Browser-only convenience: which menu was open, so a reload on the phone returns to it. */
const OPEN_MENU_KEY = 'osatelite-open-menu';

function readOpenMenuId(): string | null {
  try {
    return localStorage.getItem(OPEN_MENU_KEY);
  } catch {
    return null;
  }
}
function writeOpenMenuId(id: string | null) {
  try {
    if (id) localStorage.setItem(OPEN_MENU_KEY, id);
    else localStorage.removeItem(OPEN_MENU_KEY);
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ storage, children }: { storage: StorageAdapter; children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    ready: false,
    loadError: null,
    user: null,
    dishes: [],
    menus: [],
    settings: DEFAULT_SETTINGS,
    currentMenuId: null,
    saveStatus: 'idle',
    saveError: null,
  });
  const timer = useRef<number | null>(null);
  const pending = useRef<DailyMenu | null>(null);
  const saving = useRef<Promise<void> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [dishes, menus, settings] = await Promise.all([storage.listDishes(), storage.listMenus(), storage.getSettings()]);
      const remembered = readOpenMenuId();
      setState((s) => ({
        ...s,
        ready: true,
        loadError: null,
        dishes,
        menus,
        settings,
        currentMenuId: s.currentMenuId ?? (remembered && menus.some((m) => m.id === remembered) ? remembered : null),
      }));
    } catch (e) {
      setState((s) => ({ ...s, ready: true, loadError: (e as Error).message }));
    }
  }, [storage]);

  // Auth bootstrap
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await storage.getUser();
      if (cancelled) return;
      setState((s) => ({ ...s, user, ready: !user }));
      if (user) await loadAll();
    })();
    const off = storage.onAuthChange((user) => {
      setState((s) => ({ ...s, user, ready: !user, currentMenuId: user ? s.currentMenuId : null }));
      if (user) void loadAll();
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [storage, loadAll]);

  const flush = useCallback(async () => {
    const menu = pending.current;
    if (!menu) return;
    pending.current = null;
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setState((s) => ({ ...s, saveStatus: 'saving', saveError: null }));
    const run = (async () => {
      try {
        const saved = await storage.upsertMenu(menu);
        setState((s) => ({
          ...s,
          menus: s.menus.some((m) => m.id === saved.id) ? s.menus.map((m) => (m.id === saved.id ? saved : m)) : [saved, ...s.menus],
          saveStatus: pending.current ? 'saving' : 'saved',
        }));
      } catch (e) {
        pending.current = pending.current ?? menu; // keep unsaved changes for retry
        setState((s) => ({ ...s, saveStatus: 'error', saveError: (e as Error).message }));
      }
    })();
    saving.current = run;
    await run;
    saving.current = null;
  }, [storage]);

  const scheduleSave = useCallback(
    (menu: DailyMenu) => {
      pending.current = menu;
      setState((s) => ({ ...s, saveStatus: 'saving', saveError: null }));
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  // Flush unsaved changes when the tab is hidden / closed.
  useEffect(() => {
    const onHide = () => {
      if (pending.current) void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush]);

  const api = useMemo<StoreApi>(() => {
    const currentMenu = state.menus.find((m) => m.id === state.currentMenuId) ?? null;
    return {
      ...state,
      storage,
      currentMenu,
      reload: loadAll,
      async signIn(email, password) {
        await storage.signIn(email, password);
      },
      async signOut() {
        if (pending.current) await flush();
        await storage.signOut();
        setState((s) => ({ ...s, user: null, currentMenuId: null, dishes: [], menus: [] }));
      },
      async saveDish(dish) {
        const saved = await storage.upsertDish({ ...dish, updatedAt: nowIso() });
        setState((s) => ({
          ...s,
          dishes: s.dishes.some((d) => d.id === saved.id) ? s.dishes.map((d) => (d.id === saved.id ? saved : d)) : [...s.dishes, saved],
        }));
      },
      async openMenu(menu) {
        if (pending.current) await flush();
        const exists = state.menus.some((m) => m.id === menu.id);
        if (!exists) {
          setState((s) => ({ ...s, saveStatus: 'saving', saveError: null }));
          const saved = await storage.upsertMenu(menu);
          setState((s) => ({ ...s, menus: [saved, ...s.menus], currentMenuId: saved.id, saveStatus: 'saved' }));
        } else {
          setState((s) => ({ ...s, currentMenuId: menu.id, saveStatus: 'idle', saveError: null }));
        }
        writeOpenMenuId(menu.id);
      },
      closeMenu() {
        if (pending.current) void flush();
        writeOpenMenuId(null);
        setState((s) => ({ ...s, currentMenuId: null, saveStatus: 'idle' }));
      },
      updateCurrentMenu(update) {
        setState((s) => {
          const cur = s.menus.find((m) => m.id === s.currentMenuId);
          if (!cur) return s;
          const next = { ...update(cur), updatedAt: nowIso() };
          scheduleSave(next);
          return { ...s, menus: s.menus.map((m) => (m.id === next.id ? next : m)) };
        });
      },
      async deleteMenu(id) {
        await storage.deleteMenu(id);
        if (readOpenMenuId() === id) writeOpenMenuId(null);
        setState((s) => ({ ...s, menus: s.menus.filter((m) => m.id !== id), currentMenuId: s.currentMenuId === id ? null : s.currentMenuId }));
      },
      async saveSettings(settings) {
        const saved = await storage.saveSettings(settings);
        setState((s) => ({ ...s, settings: saved }));
      },
      async mergeBackup(dishes, menus) {
        await storage.addRecords(dishes, menus);
        await loadAll();
      },
      async replaceWithBackup(backup) {
        await storage.replaceAll(backup);
        writeOpenMenuId(null);
        setState((s) => ({ ...s, currentMenuId: null }));
        await loadAll();
      },
    };
  }, [state, storage, loadAll, flush, scheduleSave]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}
