-- 045_chat_media.sql
-- Phase 2 (MASTER_PLAN): add video support to chat messages + ensure realtime.

-- Add media_type and video_url columns (image_url already exists from 041)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text'
    CHECK (media_type IN ('text', 'image', 'video')),
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add realtime for chat_messages (same pattern as team_messages in 028)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'realtime publication add skipped: %', SQLERRM;
END $$;

-- Create team-chat storage bucket if it doesn't exist (public read, service-role writes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-chat', 'team-chat', true)
ON CONFLICT (id) DO NOTHING;
