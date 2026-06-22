-- Add 'bluesky' as a supported platform in social_posts.
-- The original CHECK constraint only allowed instagram/twitter/facebook/tiktok.

ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_platform_check;
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_platform_check
  CHECK (platform IN ('instagram', 'twitter', 'facebook', 'tiktok', 'bluesky'));
