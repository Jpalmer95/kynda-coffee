-- 013_design_studio_credits_layers
-- Tables for user credits, saved designs with editable layers,
-- product markup tiers, and credit purchase history.
-- Run after 009_catalog_overrides_unique_item_key.sql

-- ===========================================
-- 1. User Monthly Credits (auto-reset on 1st of month)
-- ===========================================
create table if not exists public.user_monthly_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year_month text not null,           -- '2026-05'
  free_credits_remaining integer not null default 10,
  paid_credits_remaining integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, year_month)
);

alter table public.user_monthly_credits enable row level security;

create policy "Users can view their own credits"
  on public.user_monthly_credits for select
  using (auth.uid() = user_id);

-- ===========================================
-- 2. Saved Designs (private to user)
-- ===========================================
create table if not exists public.saved_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  original_image_url text not null,
  final_composite_url text,             -- final rendered PNG with placement
  product_type text not null,           -- mug, tshirt, glass, tote
  layers jsonb not null default '[]'::jsonb, -- array of layer objects
  is_public boolean default false,      -- future community gallery toggle
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.saved_designs enable row level security;

create policy "Users can manage their own designs"
  on public.saved_designs for all
  using (auth.uid() = user_id);

-- ===========================================
-- 3. Printful Product Pricing Cache + Markup Tiers
-- ===========================================
create table if not exists public.printful_pricing (
  variant_id integer primary key,
  product_id integer not null,
  product_name text,
  variant_name text,
  base_cost_cents integer not null,       -- Printful cost
  currency text default 'USD',
  product_type text not null,             -- mug / apparel / tote etc
  markup_multiplier numeric(5,2) not null default 2.8,
  retail_price_cents integer generated always as (
    round(base_cost_cents * markup_multiplier) 
  ) stored,
  last_synced_at timestamptz default now()
);

-- Simple default markup tiers (adjust anytime)
comment on column public.printful_pricing.markup_multiplier is 
  '2.8x for most items, 2.5x apparel, 3.0x premium, 4.0x low-cost items';

-- ===========================================
-- 4. Credit Transactions (audit + billing)
-- ===========================================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,              -- positive = added, negative = used
  source text not null,                 -- 'monthly_free' | 'purchase' | 'generation'
  stripe_payment_intent text,
  created_at timestamptz default now()
);

-- ===========================================
-- Helper function to get or create monthly credits
-- ===========================================
create or replace function public.get_or_create_monthly_credits(p_user_id uuid)
returns public.user_monthly_credits
language plpgsql security definer
as $$
declare
  ym text := to_char(now(), 'YYYY-MM');
  rec public.user_monthly_credits;
begin
  insert into public.user_monthly_credits (user_id, year_month, free_credits_remaining)
  values (p_user_id, ym, 10)
  on conflict (user_id, year_month) do nothing;

  select * into rec
  from public.user_monthly_credits
  where user_id = p_user_id and year_month = ym;

  return rec;
end;
$$;

-- Grant usage to authenticated users
grant usage on schema public to authenticated;
grant select, insert, update on public.user_monthly_credits to authenticated;
grant select, insert, update on public.saved_designs to authenticated;
grant select on public.printful_pricing to authenticated;
grant insert, select on public.credit_transactions to authenticated;

-- ===========================================
-- Indexes for performance
-- ===========================================
create index if not exists idx_user_credits_user_month on public.user_monthly_credits(user_id, year_month);
create index if not exists idx_saved_designs_user on public.saved_designs(user_id);
create index if not exists idx_printful_product_type on public.printful_pricing(product_type);