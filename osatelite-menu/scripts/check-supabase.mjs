// Verifies the Supabase backend from the command line: sign-in, allow-list and RLS.
// Usage: SUPABASE_EMAIL=... SUPABASE_PASSWORD=... node scripts/check-supabase.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.existsSync('.env.local')
    ? fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split('=').map((s) => s.trim()))
    : [],
);
const url = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_EMAIL;
const password = process.env.SUPABASE_PASSWORD;
if (!url || !key || !email || !password) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_EMAIL / SUPABASE_PASSWORD');
  process.exit(2);
}
const anon = createClient(url, key, { auth: { persistSession: false } });
const before = await anon.from('dishes').select('id');
console.log('anonymous read of dishes ->', before.error ? `blocked (${before.error.message})` : `${before.data.length} rows (should be 0)`);
const { error } = await anon.auth.signInWithPassword({ email, password });
if (error) {
  console.error('sign-in failed:', error.message);
  process.exit(1);
}
console.log('sign-in ok as', email);
const dishes = await anon.from('dishes').select('id,name').order('name');
console.log('dishes visible after sign-in:', dishes.error ? dishes.error.message : dishes.data.length);
const menus = await anon.from('menus').select('menu_date');
console.log('menus visible after sign-in:', menus.error ? menus.error.message : menus.data.map((m) => m.menu_date).join(', '));
await anon.auth.signOut();
