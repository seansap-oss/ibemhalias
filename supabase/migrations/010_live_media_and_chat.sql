-- =====================================================================
-- IBEMHAL IAS â€” LIVE MEDIA + PERSISTENT COMMUNITY CHAT
-- Migration 010 â€” additive and idempotent
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_chat_username
  ON public.profiles(lower(chat_username))
  WHERE chat_username IS NOT NULL;

ALTER TABLE public.live_class_resources ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.live_class_resources ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.live_class_resources ADD COLUMN IF NOT EXISTS uploaded_by_email TEXT;

-- Migration 005 originally restricted resource_type to a short legacy list.
-- V5.2 supports teacher-uploaded PDFs, notes, slides, images and Office files.
ALTER TABLE public.live_class_resources
  DROP CONSTRAINT IF EXISTS live_class_resources_resource_type_check;

DO $$
BEGIN
  ALTER TABLE public.live_class_resources
    ADD CONSTRAINT live_class_resources_resource_type_check
    CHECK (
      resource_type IN (
        'pdf','notes','slides','image','audio','link','file','video'
      )
    );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL DEFAULT 'community'
    CHECK (room_type IN ('community','live_class')),
  live_class_id UUID UNIQUE REFERENCES public.live_classes(id) ON DELETE CASCADE,
  is_read_only BOOLEAN NOT NULL DEFAULT FALSE,
  slow_mode_seconds INTEGER NOT NULL DEFAULT 0 CHECK (slow_mode_seconds BETWEEN 0 AND 300),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS slow_mode_seconds INTEGER NOT NULL DEFAULT 0;


CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_actor TEXT,
  author_name TEXT NOT NULL,
  author_username TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'student'
    CHECK (author_role IN ('student','instructor','admin')),
  body TEXT NOT NULL DEFAULT '',
  reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  attachment_type TEXT CHECK (
    attachment_type IS NULL OR
    attachment_type IN ('image','video','pdf','file','link','youtube')
  ),
  attachment_path TEXT,
  attachment_name TEXT,
  attachment_mime TEXT,
  attachment_size BIGINT,
  external_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_reactions (
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_key TEXT NOT NULL,
  emoji TEXT NOT NULL CHECK (char_length(emoji) <= 16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, actor_key, emoji)
);

CREATE TABLE IF NOT EXISTS public.chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_key TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'inappropriate',
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id,user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_moderation (
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_until TIMESTAMPTZ,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  updated_by_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id,user_id)
);

INSERT INTO public.chat_rooms (slug,name,description,room_type,sort_order)
VALUES
 ('general','General','General UPSC / IAS student discussion','community',10),
 ('current-affairs','Current Affairs','Daily news, PIB and current affairs discussion','community',20),
 ('polity','Polity','Indian Polity and Constitution discussion','community',30),
 ('answer-writing','Answer Writing','Mains answer-writing practice and feedback','community',40),
 ('doubt-help','Doubt Help','Ask questions and help each other with study doubts','community',50)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON public.chat_messages(room_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned
  ON public.chat_messages(room_id,is_pinned,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message
  ON public.chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_status
  ON public.chat_reports(status,created_at DESC);

INSERT INTO storage.buckets (id,name,public,file_size_limit)
VALUES ('chat-media','chat-media',FALSE,52428800)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 52428800;

CREATE OR REPLACE FUNCTION public.is_registered_lms_user(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('student','instructor','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_chat_room(room_uuid UUID, uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_rooms r
    WHERE r.id = room_uuid
      AND (
        (r.room_type = 'community' AND public.is_registered_lms_user(uid))
        OR
        (r.room_type = 'live_class' AND EXISTS (
          SELECT 1
          FROM public.live_class_assignments a
          WHERE a.live_class_id = r.live_class_id
            AND a.student_id = uid
            AND a.status = 'active'
        ))
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = uid
            AND p.role = 'admin'
        )
      )
  );
$$;

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_rooms_read ON public.chat_rooms;
CREATE POLICY chat_rooms_read ON public.chat_rooms
FOR SELECT TO authenticated
USING (public.can_read_chat_room(id,auth.uid()));

DROP POLICY IF EXISTS chat_messages_read ON public.chat_messages;
CREATE POLICY chat_messages_read ON public.chat_messages
FOR SELECT TO authenticated
USING (public.can_read_chat_room(room_id,auth.uid()));

DROP POLICY IF EXISTS chat_reactions_read ON public.chat_reactions;
CREATE POLICY chat_reactions_read ON public.chat_reactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id
      AND public.can_read_chat_room(m.room_id,auth.uid())
  )
);


-- ---------------------------------------------------------------------
-- PRIVATE REALTIME PRESENCE AUTHORIZATION
-- Only a registered user who can read the underlying chat room may join
-- the corresponding private Realtime topic.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_realtime_chat_topic(
  p_topic TEXT,
  uid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_text TEXT;
BEGIN
  IF p_topic IS NULL OR
     p_topic !~ '^ibemhal-chat-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN FALSE;
  END IF;

  room_text := substring(p_topic FROM 14);
  RETURN public.can_read_chat_room(room_text::UUID, uid);
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ibemhal_chat_realtime_receive ON realtime.messages;
CREATE POLICY ibemhal_chat_realtime_receive
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension IN ('presence','broadcast')
  AND public.can_access_realtime_chat_topic(realtime.topic(), auth.uid())
);

DROP POLICY IF EXISTS ibemhal_chat_realtime_send ON realtime.messages;
CREATE POLICY ibemhal_chat_realtime_send
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension IN ('presence','broadcast')
  AND public.can_access_realtime_chat_topic(realtime.topic(), auth.uid())
);

-- =====================================================================
-- REALTIME PUBLICATION
-- =====================================================================
-- Supabase Cloud owns and protects the managed Realtime schema.
-- Do not ALTER the supabase_realtime publication from this migration.
--
-- After this migration succeeds:
-- Supabase Dashboard -> Database -> Publications -> supabase_realtime
-- Enable public.chat_messages.
-- =====================================================================

