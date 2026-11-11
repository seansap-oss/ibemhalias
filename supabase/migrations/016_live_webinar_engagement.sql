-- Ibemhal IAS: LMS-side webinar engagement ledger.
-- All reads/writes flow through authenticated server route handlers. RLS remains
-- enabled so these rows are never exposed through the public Data API.

CREATE TABLE IF NOT EXISTS public.live_class_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1200),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','hidden')),
  answered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_class_questions_class_status
  ON public.live_class_questions(live_class_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_class_questions_student
  ON public.live_class_questions(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.live_class_hand_raises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','acknowledged','allowed','dismissed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_class_hand_raises_class_status
  ON public.live_class_hand_raises(live_class_id, status, requested_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_class_hand_raises_one_open_request
  ON public.live_class_hand_raises(live_class_id, student_id)
  WHERE status IN ('requested','acknowledged','allowed');

CREATE OR REPLACE FUNCTION public.set_live_webinar_engagement_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_class_questions_updated_at ON public.live_class_questions;
CREATE TRIGGER trg_live_class_questions_updated_at
  BEFORE UPDATE ON public.live_class_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_live_webinar_engagement_updated_at();

DROP TRIGGER IF EXISTS trg_live_class_hand_raises_updated_at ON public.live_class_hand_raises;
CREATE TRIGGER trg_live_class_hand_raises_updated_at
  BEFORE UPDATE ON public.live_class_hand_raises
  FOR EACH ROW EXECUTE FUNCTION public.set_live_webinar_engagement_updated_at();

ALTER TABLE public.live_class_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_hand_raises ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.live_class_questions FROM anon, authenticated;
REVOKE ALL ON public.live_class_hand_raises FROM anon, authenticated;
GRANT ALL ON public.live_class_questions TO service_role;
GRANT ALL ON public.live_class_hand_raises TO service_role;
