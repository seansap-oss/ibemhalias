-- =====================================================================
-- IBEMHAL IAS — STUDENT ACCESS PREFERENCES
-- Migration 007 — additive and idempotent
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.student_access_preferences (
  student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_source TEXT NOT NULL DEFAULT 'cash_counter',
  reminder_day_before BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_hour_before BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  material_flags JSONB NOT NULL DEFAULT '{
    "detailed_study_notes": false,
    "premium_lectures": false,
    "premium_test_series": false,
    "mentor_notes": false
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE public.student_access_preferences
    ADD CONSTRAINT student_access_payment_source_check
    CHECK (
      payment_source IN (
        'cash_counter',
        'phone_booking',
        'manual_admin',
        'online_gateway'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_access_preferences_payment_source
  ON public.student_access_preferences(payment_source);

ALTER TABLE public.student_access_preferences ENABLE ROW LEVEL SECURITY;

-- No public policy: this table is managed through the server-side service role.
