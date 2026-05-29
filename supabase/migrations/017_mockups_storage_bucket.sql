-- 017_mockups_storage_bucket
-- Supabase Storage bucket for durable Printful mockup images
-- Run after 016_design_persistence_enhancements.sql

-- Create the mockups bucket (public read, private write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mockups',
  'mockups',
  true,
  10485760, -- 10MB max
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Admin-only write policy (service role or admin users)
create policy "Admins can upload mockups"
  on storage.objects for insert
  to authenticated, service_role
  with check (bucket_id = 'mockups');

-- Admin-only update policy
create policy "Admins can update mockups"
  on storage.objects for update
  to authenticated, service_role
  using (bucket_id = 'mockups');

-- Admin-only delete policy
create policy "Admins can delete mockups"
  on storage.objects for delete
  to authenticated, service_role
  using (bucket_id = 'mockups');

-- Public read (no RLS needed — bucket is public)
