-- 014_fix_saved_designs_rls
-- Clean up RLS and ensure required columns on saved_designs

-- Ensure all required columns exist
alter table if exists public.saved_designs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists prompt text,
  add column if not exists original_image_url text,
  add column if not exists layers jsonb default '[]'::jsonb,
  add column if not exists product_type text;

-- Drop and recreate policy cleanly
drop policy if exists "Users can manage their own designs" on public.saved_designs;

create policy "Users can manage their own designs"
  on public.saved_designs for all
  using (auth.uid() = user_id);

-- Also ensure RLS is enabled
alter table public.saved_designs enable row level security;
