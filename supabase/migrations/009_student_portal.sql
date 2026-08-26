-- =====================================================================
-- IBEMHAL IAS — STUDENT PORTAL + COURSE-MAPPED MATERIALS
-- Migration 009 — additive and idempotent
-- =====================================================================

-- Ensure the material access columns exist even if Migration 008 was not run.
ALTER TABLE public.cms_content
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.cms_content
  ADD COLUMN IF NOT EXISTS access_key TEXT;
ALTER TABLE public.cms_content
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

UPDATE public.cms_content
SET access_level = 'free'
WHERE access_level IS NULL OR btrim(access_level) = '';

DO $$ BEGIN
  ALTER TABLE public.cms_content
    ADD CONSTRAINT cms_content_access_level_check_v9
    CHECK (access_level IN ('free','premium'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.cms_content
    ADD CONSTRAINT cms_content_access_key_check_v9
    CHECK (
      access_key IS NULL OR access_key IN (
        'general_premium',
        'detailed_study_notes',
        'premium_lectures',
        'premium_test_series',
        'mentor_notes'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_cms_content_course_access
  ON public.cms_content(course_id, access_level, is_published, sort_order);

-- Reconcile the material tier used by Student Access V4 with the original profile check.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check_v9;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check_v9
  CHECK (tier IN ('free','premium','foundation','prelims','mains','optional','all-access'));

-- Real student study-material activity / bookmarks / completion.
CREATE TABLE IF NOT EXISTS public.student_material_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  last_opened_at TIMESTAMPTZ,
  study_seconds INTEGER NOT NULL DEFAULT 0 CHECK (study_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_student_material_progress_user
  ON public.student_material_progress(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_material_progress_content
  ON public.student_material_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_student_material_bookmarks
  ON public.student_material_progress(user_id, bookmarked)
  WHERE bookmarked = TRUE;

ALTER TABLE public.student_material_progress ENABLE ROW LEVEL SECURITY;

-- Student dashboard reads/writes this table through server-side API routes.
-- No public RLS policy is intentionally created.
