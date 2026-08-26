-- =====================================================================
-- IBEMHAL IAS — CMS FREE / PREMIUM MATERIAL ACCESS
-- Migration 008 — additive and idempotent
-- =====================================================================

ALTER TABLE public.cms_content
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.cms_content
  ADD COLUMN IF NOT EXISTS access_key TEXT;

UPDATE public.cms_content
SET access_level = 'free'
WHERE access_level IS NULL OR btrim(access_level) = '';

DO $$ BEGIN
  ALTER TABLE public.cms_content
    ADD CONSTRAINT cms_content_access_level_check
    CHECK (access_level IN ('free','premium'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.cms_content
    ADD CONSTRAINT cms_content_access_key_check
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

CREATE INDEX IF NOT EXISTS idx_cms_content_access
  ON public.cms_content(section_path, access_level, is_published, sort_order);
