-- O Satélite · Menu do dia — initial schema
-- Tables are separate from any pre-existing tables in the project.

create table if not exists public.dishes (
  id uuid primary key,
  name text not null check (length(trim(name)) > 0),
  category text not null check (category in ('sopa','peixe','carne','vegetariano','sobremesa')),
  default_price_cents integer not null check (default_price_cents >= 0),
  serving_info text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menus (
  id uuid primary key,
  menu_date date not null unique,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Only e-mails listed here may read or write menu data, even if they can sign in.
create table if not exists public.allowed_users (
  email text primary key
);

alter table public.dishes enable row level security;
alter table public.menus enable row level security;
alter table public.settings enable row level security;
alter table public.allowed_users enable row level security;

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_allowed_user() from public;
grant execute on function public.is_allowed_user() to authenticated;

drop policy if exists "allowed users manage dishes" on public.dishes;
create policy "allowed users manage dishes" on public.dishes
  for all to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());

drop policy if exists "allowed users manage menus" on public.menus;
create policy "allowed users manage menus" on public.menus
  for all to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());

drop policy if exists "allowed users manage settings" on public.settings;
create policy "allowed users manage settings" on public.settings
  for all to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());

-- allowed_users has no policies: it is only readable through is_allowed_user().

-- Atomic "replace everything" used by backup restore (after explicit confirmation in the app).
create or replace function public.replace_all_data(p_dishes jsonb, p_menus jsonb, p_settings jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  if not public.is_allowed_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.menus;
  delete from public.dishes;
  insert into public.dishes (id, name, category, default_price_cents, serving_info, archived, created_at, updated_at)
  select (d->>'id')::uuid, d->>'name', d->>'category', (d->>'default_price_cents')::int, d->>'serving_info',
         (d->>'archived')::boolean, (d->>'created_at')::timestamptz, (d->>'updated_at')::timestamptz
  from jsonb_array_elements(p_dishes) as d;
  insert into public.menus (id, menu_date, items, created_at, updated_at)
  select (m->>'id')::uuid, (m->>'menu_date')::date, m->'items', (m->>'created_at')::timestamptz, (m->>'updated_at')::timestamptz
  from jsonb_array_elements(p_menus) as m;
  insert into public.settings (id, data, updated_at) values ('template', p_settings, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end;
$$;

revoke all on function public.replace_all_data(jsonb, jsonb, jsonb) from public;
grant execute on function public.replace_all_data(jsonb, jsonb, jsonb) to authenticated;

-- Initial catalogue transcribed from the reference menu (06-09-2026). Idempotent.
insert into public.dishes (id, name, category, default_price_cents, serving_info, archived, created_at, updated_at) values
  ('a0000000-0000-4000-8000-000000000001', 'Canja de Galinha', 'sopa', 200, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000011', 'Polvo à Lagareiro', 'peixe', 1850, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000012', 'Arroz de Gambas', 'peixe', 1350, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000013', 'Sardinhas Assadas', 'peixe', 1100, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000014', 'Carapaus Grelhados', 'peixe', 1100, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000015', 'Corvininha Grelhada', 'peixe', 1250, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000016', 'Besugo Grelhado', 'peixe', 1200, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000017', 'Bife de Atum Grelhado', 'peixe', 1850, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000018', 'Bife de Espadarte Grelhado', 'peixe', 1850, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000019', 'Peixe Espada Branco Grelhado', 'peixe', 1750, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-00000000001a', 'Boca Negra Grelhado', 'peixe', 2400, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-00000000001b', 'Lula Grande dos Açores Grelhada', 'peixe', 3400, '2 PESSOAS', false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000021', 'Cozido à Portuguesa', 'carne', 1350, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000022', 'Pernil Assado no Forno', 'carne', 1350, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000023', 'Piano no Churrasco', 'carne', 1300, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000024', 'Hambúrguer Grelhado com Batata e Arroz', 'carne', 1200, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000025', 'Bife de Peru Frito ou Grelhado', 'carne', 1200, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000026', 'Entremeada de Porco Grelhada', 'carne', 1000, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000027', 'Salsichas Frescas Grelhadas', 'carne', 1000, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000031', 'Caril de Legumes', 'vegetariano', 900, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000041', 'Pudim Abade de Priscos', 'sobremesa', 550, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000042', 'Bolo de Coco', 'sobremesa', 400, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000043', 'Semifrio de Morango', 'sobremesa', 400, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000044', 'Farófias', 'sobremesa', 400, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000045', 'Taça de Frutos Vermelhos', 'sobremesa', 400, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000046', 'Torta de Laranja', 'sobremesa', 400, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z'),
  ('a0000000-0000-4000-8000-000000000047', 'Melão', 'sobremesa', 350, null, false, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z')
on conflict (id) do nothing;

insert into public.menus (id, menu_date, items, created_at, updated_at) values
  ('b0000000-0000-4000-8000-000000000001', '2026-09-06', '[{"dishId": "a0000000-0000-4000-8000-000000000001", "name": "Canja de Galinha", "category": "sopa", "priceCents": 200, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000011", "name": "Polvo à Lagareiro", "category": "peixe", "priceCents": 1850, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000012", "name": "Arroz de Gambas", "category": "peixe", "priceCents": 1350, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000013", "name": "Sardinhas Assadas", "category": "peixe", "priceCents": 1100, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000014", "name": "Carapaus Grelhados", "category": "peixe", "priceCents": 1100, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000015", "name": "Corvininha Grelhada", "category": "peixe", "priceCents": 1250, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000016", "name": "Besugo Grelhado", "category": "peixe", "priceCents": 1200, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000017", "name": "Bife de Atum Grelhado", "category": "peixe", "priceCents": 1850, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000018", "name": "Bife de Espadarte Grelhado", "category": "peixe", "priceCents": 1850, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000019", "name": "Peixe Espada Branco Grelhado", "category": "peixe", "priceCents": 1750, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-00000000001a", "name": "Boca Negra Grelhado", "category": "peixe", "priceCents": 2400, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-00000000001b", "name": "Lula Grande dos Açores Grelhada", "category": "peixe", "priceCents": 3400, "servingInfo": "2 PESSOAS"}, {"dishId": "a0000000-0000-4000-8000-000000000021", "name": "Cozido à Portuguesa", "category": "carne", "priceCents": 1350, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000022", "name": "Pernil Assado no Forno", "category": "carne", "priceCents": 1350, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000023", "name": "Piano no Churrasco", "category": "carne", "priceCents": 1300, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000024", "name": "Hambúrguer Grelhado com Batata e Arroz", "category": "carne", "priceCents": 1200, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000025", "name": "Bife de Peru Frito ou Grelhado", "category": "carne", "priceCents": 1200, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000026", "name": "Entremeada de Porco Grelhada", "category": "carne", "priceCents": 1000, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000027", "name": "Salsichas Frescas Grelhadas", "category": "carne", "priceCents": 1000, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000031", "name": "Caril de Legumes", "category": "vegetariano", "priceCents": 900, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000041", "name": "Pudim Abade de Priscos", "category": "sobremesa", "priceCents": 550, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000042", "name": "Bolo de Coco", "category": "sobremesa", "priceCents": 400, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000043", "name": "Semifrio de Morango", "category": "sobremesa", "priceCents": 400, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000044", "name": "Farófias", "category": "sobremesa", "priceCents": 400, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000045", "name": "Taça de Frutos Vermelhos", "category": "sobremesa", "priceCents": 400, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000046", "name": "Torta de Laranja", "category": "sobremesa", "priceCents": 400, "servingInfo": null}, {"dishId": "a0000000-0000-4000-8000-000000000047", "name": "Melão", "category": "sobremesa", "priceCents": 350, "servingInfo": null}]'::jsonb, '2026-09-06T00:00:00Z', '2026-09-06T00:00:00Z')
on conflict (menu_date) do nothing;

insert into public.settings (id, data) values
  ('template', '{"title":"PRATOS DO DIA","footerLines":["Os preços têm IVA à taxa legal","Há livro de reclamações","Não temos Multibanco"],"uppercaseNames":true,"logoGrayscale":false}'::jsonb)
on conflict (id) do nothing;
