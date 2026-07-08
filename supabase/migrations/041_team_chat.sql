-- 041_team_chat.sql
-- Team chat: channels, messages, members. GroupMe replacement.
-- All within the Kynda platform. Staff+ access.

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'channel' CHECK (type IN ('channel', 'dm')),
  description TEXT,
  icon TEXT,                           -- emoji or icon name
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON public.chat_channels(type, sort_order);

CREATE TABLE IF NOT EXISTS public.chat_channel_members (
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user ON public.chat_channel_members(user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  image_url TEXT,                      -- Supabase Storage URL for images
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at DESC);

-- RLS: staff+ can access chat. Service role for admin API.
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_channels_service_all" ON public.chat_channels
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "chat_members_service_all" ON public.chat_channel_members
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "chat_messages_service_all" ON public.chat_messages
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Staff can read channels they're members of + send messages
CREATE POLICY "chat_channels_staff_read" ON public.chat_channels
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "chat_members_staff_read" ON public.chat_channel_members
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "chat_messages_staff_read" ON public.chat_messages
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "chat_messages_staff_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Default channels (will be inserted on first use via API)
