import type { StorageAdapter } from './adapter';
import { LocalAdapter } from './localAdapter';
import { SupabaseAdapter } from './supabaseAdapter';

export function createStorage(): StorageAdapter {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const forceLocal = new URLSearchParams(location.search).get('storage') === 'local';
  if (url && key && !forceLocal) return new SupabaseAdapter(url, key);
  return new LocalAdapter();
}

export type { StorageAdapter, AuthUser } from './adapter';
