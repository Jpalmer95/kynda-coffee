-- 016_design_persistence_enhancements
-- Add columns needed for Design Studio save/load + autosave + thumbnails
-- Run after 014_fix_saved_designs_rls.sql

-- Add new columns for full design persistence
alter table if exists public.saved_designs
  add column if not exists product_id text,
  add column if not exists variant_id integer,
  add column if not exists name text default 'Untitled Design',
  add column if not exists view text default 'front',
  add column if not exists thumbnail_url text;

-- Make prompt and original_image_url nullable (layer-based designs don't require them)
alter table if exists public.saved_designs
  alter column prompt drop not null,
  alter column original_image_url drop not null;

-- Add updated_at trigger if not exists
create or replace function public.update_saved_designs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_saved_designs_updated_at on public.saved_designs;
create trigger trg_saved_designs_updated_at
  before update on public.saved_designs
  for each row execute function public.update_saved_designs_updated_at();

-- Index for fast user+product lookups
create index if not exists idx_saved_designs_user_product
  on public.saved_designs(user_id, product_id);
