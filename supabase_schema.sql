-- MISA production database
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(14,2) not null default 0 check (price >= 0),
  category text not null default 'Other',
  description text not null default '',
  link text not null default '',
  image_url text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.admin_users enable row level security;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admin_users to authenticated;

-- Public visitors can only read visible products.
drop policy if exists "public read visible products" on public.products;
create policy "public read visible products" on public.products
for select using (hidden = false or exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Only users explicitly listed as admins can create/edit/delete products.
drop policy if exists "admins insert products" on public.products;
create policy "admins insert products" on public.products
for insert to authenticated with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins update products" on public.products;
create policy "admins update products" on public.products
for update to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins delete products" on public.products;
create policy "admins delete products" on public.products
for delete to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- An admin can see only their own admin record. No public listing of admins.
drop policy if exists "admins read own record" on public.admin_users;
create policy "admins read own record" on public.admin_users
for select to authenticated using (user_id = auth.uid());

-- Storage bucket. Create it in Dashboard if this statement is not enabled in your project UI.
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;

-- Public images can be read; only admins may upload/update/delete.
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects
for update to authenticated using (bucket_id = 'product-images' and exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (bucket_id = 'product-images' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- After creating your admin account in Authentication > Users, run:
-- insert into public.admin_users (user_id) values ('YOUR_AUTH_USER_UUID');
