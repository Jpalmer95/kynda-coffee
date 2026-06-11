-- 033: Admin-curated studio designs (trending/recommended gallery)
-- Admins can upload or AI-generate designs that surface in the Design Studio
-- "Designs" tab and on the Shop merch page.

create table if not exists public.studio_designs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  image_url text not null,
  style text not null default 'logo',          -- logo|nature|minimal|vintage|typography|abstract|seasonal
  product_id text,                              -- optional: suggested product (catalog id e.g. 'unisex-tee')
  trending boolean not null default false,      -- shows in "Trending Designs" rail
  seasonal boolean not null default false,
  is_active boolean not null default true,      -- hidden from customers when false
  show_on_shop boolean not null default true,   -- surfaces on /shop/merch recommendations
  sort_order int not null default 0,
  prompt text,                                  -- AI prompt if generated
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_designs enable row level security;

-- Public can read active designs
drop policy if exists "studio_designs_public_read" on public.studio_designs;
create policy "studio_designs_public_read"
  on public.studio_designs for select
  using (is_active = true);

-- Writes go through the service role (admin API routes) only.

create index if not exists idx_studio_designs_active
  on public.studio_designs (is_active, trending, sort_order);

-- Public storage bucket for design images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-designs', 'studio-designs', true, 10485760, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "studio_designs_storage_public_read" on storage.objects;
create policy "studio_designs_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'studio-designs');
