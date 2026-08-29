-- =====================================================================
-- IBEMHAL IAS LMS — MIGRATION 014: TEACHER CRM + STAFF DATABASE
-- Project Ref: nhjhnevxyynllomfmyxp
-- Additive/idempotent. Existing students/courses/classes are preserved.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  teacher_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_code TEXT UNIQUE,
  alternate_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_region TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'India',
  emergency_contact_name TEXT,
  emergency_contact_relation TEXT,
  emergency_contact_phone TEXT,
  qualification TEXT,
  specialization TEXT,
  joining_date DATE,
  employment_status TEXT NOT NULL DEFAULT 'active',
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE public.teacher_profiles
    ADD CONSTRAINT teacher_profiles_status_check
    CHECK (employment_status IN ('active','inactive','leave','archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.teacher_permissions (
  teacher_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_live_classes BOOLEAN NOT NULL DEFAULT true,
  can_schedule_classes BOOLEAN NOT NULL DEFAULT true,
  can_teacher_studio BOOLEAN NOT NULL DEFAULT true,
  can_study_materials BOOLEAN NOT NULL DEFAULT true,
  can_upload_materials BOOLEAN NOT NULL DEFAULT true,
  can_attendance BOOLEAN NOT NULL DEFAULT true,
  can_mock_tests BOOLEAN NOT NULL DEFAULT false,
  can_view_student_contacts BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  follow_up_date DATE,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE public.teacher_notes
    ADD CONSTRAINT teacher_notes_priority_check
    CHECK (priority IN ('low','normal','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.teacher_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_status
  ON public.teacher_profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher
  ON public.teacher_notes(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_activity_teacher
  ON public.teacher_activity_log(teacher_id, created_at DESC);

INSERT INTO public.teacher_profiles (teacher_id, staff_code, joining_date)
SELECT
  p.id,
  'TC-' || UPPER(SUBSTRING(REPLACE(p.id::text, '-', '') FROM 1 FOR 6)),
  COALESCE(p.created_at::date, CURRENT_DATE)
FROM public.profiles p
WHERE p.role = 'instructor'
ON CONFLICT (teacher_id) DO NOTHING;

INSERT INTO public.teacher_permissions (teacher_id)
SELECT p.id
FROM public.profiles p
WHERE p.role = 'instructor'
ON CONFLICT (teacher_id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_teacher_profiles_updated_at ON public.teacher_profiles;
CREATE TRIGGER trg_teacher_profiles_updated_at
BEFORE UPDATE ON public.teacher_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_teacher_permissions_updated_at ON public.teacher_permissions;
CREATE TRIGGER trg_teacher_permissions_updated_at
BEFORE UPDATE ON public.teacher_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_teacher_notes_updated_at ON public.teacher_notes;
CREATE TRIGGER trg_teacher_notes_updated_at
BEFORE UPDATE ON public.teacher_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_activity_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'teacher_profiles',
        'teacher_permissions',
        'teacher_notes',
        'teacher_activity_log'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      r.policyname,
      r.tablename
    );
  END LOOP;
END $$;

CREATE POLICY "teacher_profiles_select_own"
ON public.teacher_profiles FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "teacher_profiles_admin_all"
ON public.teacher_profiles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "teacher_permissions_select_own"
ON public.teacher_permissions FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "teacher_permissions_admin_all"
ON public.teacher_permissions FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "teacher_notes_admin_all"
ON public.teacher_notes FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "teacher_activity_admin_all"
ON public.teacher_activity_log FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
