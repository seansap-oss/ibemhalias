-- =====================================================================
-- IBEMHAL IAS — LIVE CLASS ACCESS, ALLOCATION, ATTENDANCE & REMINDERS
-- Migration 006 — additive and idempotent
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron could not be enabled automatically: %', SQLERRM;
END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net could not be enabled automatically: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- Stable student identity
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.ibemhal_student_code_seq START 1001;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.ibemhal_normalize_phone(raw_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE d TEXT;
BEGIN
  d := regexp_replace(COALESCE(raw_phone, ''), '[^0-9]', '', 'g');
  IF length(d) = 10 THEN d := '91' || d; END IF;
  IF length(d) = 11 AND left(d, 1) = '0' THEN d := '91' || substring(d from 2); END IF;
  RETURN NULLIF(d, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_ibemhal_student_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'student' AND (NEW.student_code IS NULL OR btrim(NEW.student_code) = '') THEN
    NEW.student_code := 'IBH-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.ibemhal_student_code_seq')::TEXT, 5, '0');
  END IF;
  NEW.phone := public.ibemhal_normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_ibemhal_identity ON public.profiles;
CREATE TRIGGER trg_profiles_ibemhal_identity
BEFORE INSERT OR UPDATE OF phone, role, student_code ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_ibemhal_student_identity();

UPDATE public.profiles
SET student_code = 'IBH-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.ibemhal_student_code_seq')::TEXT, 5, '0')
WHERE role = 'student' AND (student_code IS NULL OR btrim(student_code) = '');

UPDATE public.profiles SET phone = public.ibemhal_normalize_phone(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_code ON public.profiles(student_code) WHERE student_code IS NOT NULL;

-- Ensure commerce columns needed by automatic entitlement exist.
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS enrolled_via TEXT NOT NULL DEFAULT 'admin_manual';
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ---------------------------------------------------------------------
-- Virtual classrooms
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_class_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity > 0),
  provider TEXT NOT NULL DEFAULT '100ms',
  provider_room_id TEXT,
  provider_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.live_class_rooms (name, capacity, provider)
VALUES
  ('Small Room 1', 10, '100ms'),
  ('Small Room 2', 10, '100ms'),
  ('Room B', 30, '100ms'),
  ('Hall B', 120, '100ms'),
  ('Live Hall A', 250, '100ms'),
  ('Large Broadcast', 1000, '100ms')
ON CONFLICT (name) DO NOTHING;

-- Reconcile with migration 005 if it already created this table.
CREATE TABLE IF NOT EXISTS public.live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  faculty_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '100ms',
  status TEXT NOT NULL DEFAULT 'scheduled',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS faculty_name TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '100ms';
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS provider_room_id TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.live_class_rooms(id) ON DELETE SET NULL;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 500;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS join_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS hls_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE public.live_classes ADD CONSTRAINT live_classes_status_check_v6 CHECK (status IN ('scheduled','live','completed','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_live_classes_start ON public.live_classes(starts_at);
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON public.live_classes(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_live_classes_room ON public.live_classes(room_id, starts_at);

-- A class may be granted by one or many purchased course/packages.
CREATE TABLE IF NOT EXISTS public.live_class_course_access (
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (live_class_id, course_id)
);

-- Explicit per-student pass. One student may have any number of classes.
CREATE TABLE IF NOT EXISTS public.live_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active',
  access_pass_id UUID NOT NULL DEFAULT gen_random_uuid(),
  assigned_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(live_class_id, student_id),
  UNIQUE(access_pass_id)
);

DO $$ BEGIN
  ALTER TABLE public.live_class_assignments ADD CONSTRAINT live_assign_source_check CHECK (source IN ('manual','package','purchase','all_access'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.live_class_assignments ADD CONSTRAINT live_assign_status_check CHECK (status IN ('active','revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_live_assign_student ON public.live_class_assignments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_live_assign_class ON public.live_class_assignments(live_class_id, status);

-- ---------------------------------------------------------------------
-- Resources and attendance
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_class_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'pdf',
  storage_path TEXT,
  external_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.live_class_resources ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.live_class_resources ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'pdf';
ALTER TABLE public.live_class_resources ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.live_class_resources ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE public.live_class_resources ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_live_resources_class ON public.live_class_resources(live_class_id, sort_order);

CREATE TABLE IF NOT EXISTS public.live_class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_join_at TIMESTAMPTZ,
  last_join_at TIMESTAMPTZ,
  last_leave_at TIMESTAMPTZ,
  join_count INTEGER NOT NULL DEFAULT 0,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  attendance_percent NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(live_class_id, student_id)
);
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS first_join_at TIMESTAMPTZ;
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS last_join_at TIMESTAMPTZ;
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS last_leave_at TIMESTAMPTZ;
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS join_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS watch_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS attendance_percent NUMERIC(5,2);
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'present';
ALTER TABLE public.live_class_attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE public.live_class_attendance ADD CONSTRAINT live_attendance_unique_v6 UNIQUE(live_class_id, student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_live_attendance_class ON public.live_class_attendance(live_class_id);
CREATE INDEX IF NOT EXISTS idx_live_attendance_student ON public.live_class_attendance(student_id);

-- ---------------------------------------------------------------------
-- Reminder rules, queue and settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_class_reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  offset_minutes INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  whatsapp_template_name TEXT,
  message_template TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_rule_global_unique ON public.live_class_reminder_rules(rule_type) WHERE live_class_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_rule_class_unique ON public.live_class_reminder_rules(live_class_id, rule_type) WHERE live_class_id IS NOT NULL;

INSERT INTO public.live_class_reminder_rules (live_class_id, rule_type, offset_minutes, enabled, whatsapp_template_name, message_template)
VALUES
  (NULL, 'purchase_confirmation', 0, TRUE, 'ibemhal_purchase_confirmation', 'Ibemhal IAS: {{student_name}}, access to {{class_title}} is confirmed. {{schedule}}. Join: {{join_url}}'),
  (NULL, 'day_before', 1440, TRUE, 'ibemhal_class_reminder', 'Reminder: {{class_title}} starts {{schedule}}. Join: {{join_url}}'),
  (NULL, 'hour_before', 60, TRUE, 'ibemhal_class_reminder', 'Reminder: {{class_title}} starts in about 1 hour. {{schedule}}. Join: {{join_url}}'),
  (NULL, 'ten_min_before', 10, TRUE, 'ibemhal_class_reminder', 'Reminder: {{class_title}} starts in about 10 minutes. Join: {{join_url}}'),
  (NULL, 'recording_ready', 0, TRUE, 'ibemhal_recording_ready', 'Recording ready: {{class_title}}. Open: {{join_url}}')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.live_class_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.live_class_reminder_rules(id) ON DELETE SET NULL,
  rule_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(live_class_id, student_id, rule_type)
);
DO $$ BEGIN
  ALTER TABLE public.live_class_notifications ADD CONSTRAINT live_notification_status_check CHECK (status IN ('pending','sent','failed','skipped','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_live_notifications_due ON public.live_class_notifications(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_live_notifications_student ON public.live_class_notifications(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.live_class_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.live_class_settings(key, value) VALUES
  ('automation_enabled','false'),
  ('automation_base_url',''),
  ('automation_secret','')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- Entitlement sync
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.schedule_live_class_notifications(p_class_id UUID, p_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE c live_classes%ROWTYPE; r live_class_reminder_rules%ROWTYPE; when_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO c FROM live_classes WHERE id = p_class_id;
  IF NOT FOUND OR c.status = 'cancelled' OR c.starts_at IS NULL THEN RETURN; END IF;

  FOR r IN SELECT * FROM live_class_reminder_rules WHERE live_class_id IS NULL AND enabled = TRUE LOOP
    IF r.rule_type = 'recording_ready' THEN CONTINUE; END IF;
    IF r.rule_type = 'purchase_confirmation' THEN
      when_at := NOW();
    ELSE
      when_at := c.starts_at - make_interval(mins => r.offset_minutes);
      IF when_at < NOW() THEN when_at := NOW(); END IF;
    END IF;

    INSERT INTO live_class_notifications(live_class_id, student_id, rule_id, rule_type, scheduled_for, status)
    VALUES (p_class_id, p_student_id, r.id, r.rule_type, when_at, 'pending')
    ON CONFLICT (live_class_id, student_id, rule_type) DO UPDATE SET
      rule_id = EXCLUDED.rule_id,
      scheduled_for = CASE WHEN live_class_notifications.status = 'sent' AND EXCLUDED.rule_type = 'purchase_confirmation'
                           THEN live_class_notifications.scheduled_for ELSE EXCLUDED.scheduled_for END,
      status = CASE WHEN live_class_notifications.status = 'sent' AND EXCLUDED.rule_type = 'purchase_confirmation'
                    THEN 'sent' ELSE 'pending' END,
      last_error = NULL,
      updated_at = NOW();
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_live_class_assignments(p_class_id UUID DEFAULT NULL, p_student_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO live_class_assignments(live_class_id, student_id, source, status)
  SELECT DISTINCT lca.live_class_id, e.user_id, 'package', 'active'
  FROM live_class_course_access lca
  JOIN enrollments e ON e.course_id = lca.course_id AND e.payment_status = 'paid'
  JOIN profiles p ON p.id = e.user_id AND p.role = 'student'
  JOIN live_classes lc ON lc.id = lca.live_class_id AND lc.status <> 'cancelled'
  WHERE (p_class_id IS NULL OR lca.live_class_id = p_class_id)
    AND (p_student_id IS NULL OR e.user_id = p_student_id)
  ON CONFLICT (live_class_id, student_id) DO UPDATE SET
    status = 'active',
    source = CASE WHEN live_class_assignments.source = 'manual' THEN 'manual' ELSE EXCLUDED.source END,
    updated_at = NOW();

  INSERT INTO live_class_assignments(live_class_id, student_id, source, status)
  SELECT lc.id, p.id, 'all_access', 'active'
  FROM live_classes lc CROSS JOIN profiles p
  WHERE p.role = 'student' AND p.tier = 'all-access' AND lc.status <> 'cancelled'
    AND (p_class_id IS NULL OR lc.id = p_class_id)
    AND (p_student_id IS NULL OR p.id = p_student_id)
  ON CONFLICT (live_class_id, student_id) DO UPDATE SET status = 'active', updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_live_class_assignments_for_student(p_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE live_class_assignments a
  SET status = 'revoked', updated_at = NOW()
  WHERE a.student_id = p_student_id AND a.source IN ('package','purchase','all_access')
    AND NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = p_student_id AND p.tier = 'all-access'
    )
    AND NOT EXISTS (
      SELECT 1 FROM live_class_course_access lca
      JOIN enrollments e ON e.course_id = lca.course_id
      WHERE lca.live_class_id = a.live_class_id AND e.user_id = p_student_id AND e.payment_status = 'paid'
    );
  PERFORM public.sync_live_class_assignments(NULL, p_student_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_live_class_assignments_for_class(p_class_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE live_class_assignments a
  SET status = 'revoked', updated_at = NOW()
  WHERE a.live_class_id = p_class_id AND a.source IN ('package','purchase')
    AND NOT EXISTS (
      SELECT 1 FROM live_class_course_access lca
      JOIN enrollments e ON e.course_id = lca.course_id
      WHERE lca.live_class_id = p_class_id AND e.user_id = a.student_id AND e.payment_status = 'paid'
    );
  PERFORM public.sync_live_class_assignments(p_class_id, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_live_assignment_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM public.schedule_live_class_notifications(NEW.live_class_id, NEW.student_id);
  ELSE
    UPDATE live_class_notifications SET status = 'cancelled', updated_at = NOW()
    WHERE live_class_id = NEW.live_class_id AND student_id = NEW.student_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_live_assignment_notifications ON public.live_class_assignments;
CREATE TRIGGER trg_live_assignment_notifications AFTER INSERT OR UPDATE OF status ON public.live_class_assignments
FOR EACH ROW EXECUTE FUNCTION public.trg_live_assignment_notifications();

CREATE OR REPLACE FUNCTION public.trg_live_enrollment_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.reconcile_live_class_assignments_for_student(OLD.user_id); RETURN OLD;
  ELSE
    PERFORM public.reconcile_live_class_assignments_for_student(NEW.user_id); RETURN NEW;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS trg_live_enrollment_sync ON public.enrollments;
DROP TRIGGER IF EXISTS trg_live_enrollment_sync_upsert ON public.enrollments;
DROP TRIGGER IF EXISTS trg_live_enrollment_sync_delete ON public.enrollments;
CREATE TRIGGER trg_live_enrollment_sync_upsert AFTER INSERT OR UPDATE OF payment_status, course_id ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.trg_live_enrollment_sync();
CREATE TRIGGER trg_live_enrollment_sync_delete AFTER DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.trg_live_enrollment_sync();

CREATE OR REPLACE FUNCTION public.trg_live_course_map_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    cid := OLD.live_class_id;
    PERFORM public.reconcile_live_class_assignments_for_class(cid);
    RETURN OLD;
  END IF;
  cid := NEW.live_class_id;
  PERFORM public.reconcile_live_class_assignments_for_class(cid);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_live_course_map_sync ON public.live_class_course_access;
CREATE TRIGGER trg_live_course_map_sync AFTER INSERT OR DELETE ON public.live_class_course_access
FOR EACH ROW EXECUTE FUNCTION public.trg_live_course_map_sync();

CREATE OR REPLACE FUNCTION public.trg_live_reschedule_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a RECORD;
BEGIN
  IF NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE live_class_notifications SET status = CASE WHEN NEW.status = 'cancelled' THEN 'cancelled' ELSE 'pending' END, updated_at = NOW()
    WHERE live_class_id = NEW.id AND status IN ('pending','failed');
    IF NEW.status <> 'cancelled' THEN
      FOR a IN SELECT student_id FROM live_class_assignments WHERE live_class_id = NEW.id AND status = 'active' LOOP
        PERFORM public.schedule_live_class_notifications(NEW.id, a.student_id);
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_live_reschedule_notifications ON public.live_classes;
CREATE TRIGGER trg_live_reschedule_notifications AFTER UPDATE OF starts_at, status ON public.live_classes
FOR EACH ROW EXECUTE FUNCTION public.trg_live_reschedule_notifications();

-- Initial sync for existing paid enrollments.
SELECT public.sync_live_class_assignments(NULL, NULL);

-- ---------------------------------------------------------------------
-- Supabase Cron -> Vercel reminder processor every five minutes.
-- Admin UI fills automation_base_url + automation_secret and enables it.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoke_ibemhal_live_reminder_processor()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE base_url TEXT; secret TEXT; enabled TEXT;
BEGIN
  SELECT value INTO enabled FROM live_class_settings WHERE key = 'automation_enabled';
  IF COALESCE(enabled, 'false') <> 'true' THEN RETURN; END IF;
  SELECT value INTO base_url FROM live_class_settings WHERE key = 'automation_base_url';
  SELECT value INTO secret FROM live_class_settings WHERE key = 'automation_secret';
  IF COALESCE(base_url,'') = '' OR COALESCE(secret,'') = '' THEN RETURN; END IF;
  PERFORM net.http_post(
    url := rtrim(base_url, '/') || '/api/live-class/reminders/process',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'pg_net is not enabled; reminder processor was not invoked.';
END;
$$;

DO $$
DECLARE job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'ibemhal-live-reminders-5m' LIMIT 1;
      IF job_id IS NOT NULL THEN PERFORM cron.unschedule(job_id); END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule('ibemhal-live-reminders-5m', '*/5 * * * *', 'SELECT public.invoke_ibemhal_live_reminder_processor();');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Reminder cron could not be scheduled automatically: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- Updated-at helper triggers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_rooms_updated ON public.live_class_rooms;
CREATE TRIGGER trg_live_rooms_updated BEFORE UPDATE ON public.live_class_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_live_classes_updated ON public.live_classes;
CREATE TRIGGER trg_live_classes_updated BEFORE UPDATE ON public.live_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_live_assign_updated ON public.live_class_assignments;
CREATE TRIGGER trg_live_assign_updated BEFORE UPDATE ON public.live_class_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_live_rules_updated ON public.live_class_reminder_rules;
CREATE TRIGGER trg_live_rules_updated BEFORE UPDATE ON public.live_class_reminder_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_live_notification_updated ON public.live_class_notifications;
CREATE TRIGGER trg_live_notification_updated BEFORE UPDATE ON public.live_class_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------
-- RLS: app uses service-role APIs; authenticated students may read own data.
-- ---------------------------------------------------------------------
ALTER TABLE public.live_class_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_course_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_classes_student_select ON public.live_classes;
CREATE POLICY live_classes_student_select ON public.live_classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.live_class_assignments a WHERE a.live_class_id = id AND a.student_id = auth.uid() AND a.status = 'active')
  OR public.is_admin()
);
DROP POLICY IF EXISTS live_assignments_student_select ON public.live_class_assignments;
CREATE POLICY live_assignments_student_select ON public.live_class_assignments FOR SELECT USING (student_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS live_resources_student_select ON public.live_class_resources;
CREATE POLICY live_resources_student_select ON public.live_class_resources FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.live_class_assignments a WHERE a.live_class_id = live_class_id AND a.student_id = auth.uid() AND a.status = 'active')
  OR public.is_admin()
);
DROP POLICY IF EXISTS live_attendance_student_select ON public.live_class_attendance;
CREATE POLICY live_attendance_student_select ON public.live_class_attendance FOR SELECT USING (student_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS live_notifications_student_select ON public.live_class_notifications;
CREATE POLICY live_notifications_student_select ON public.live_class_notifications FOR SELECT USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS live_rooms_admin_all ON public.live_class_rooms;
CREATE POLICY live_rooms_admin_all ON public.live_class_rooms FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS live_classes_admin_all ON public.live_classes;
CREATE POLICY live_classes_admin_all ON public.live_classes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS live_course_access_admin_all ON public.live_class_course_access;
CREATE POLICY live_course_access_admin_all ON public.live_class_course_access FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS live_assignments_admin_all ON public.live_class_assignments;
CREATE POLICY live_assignments_admin_all ON public.live_class_assignments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS live_resources_admin_all ON public.live_class_resources;
CREATE POLICY live_resources_admin_all ON public.live_class_resources FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS live_attendance_admin_all ON public.live_class_attendance;
CREATE POLICY live_attendance_admin_all ON public.live_class_attendance FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS live_rules_admin_all ON public.live_class_reminder_rules;
CREATE POLICY live_rules_admin_all ON public.live_class_reminder_rules FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS live_notifications_admin_all ON public.live_class_notifications;
CREATE POLICY live_notifications_admin_all ON public.live_class_notifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS live_settings_admin_all ON public.live_class_settings;
CREATE POLICY live_settings_admin_all ON public.live_class_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT EXECUTE ON FUNCTION public.sync_live_class_assignments(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_live_class_assignments_for_student(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_live_class_assignments_for_class(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.schedule_live_class_notifications(UUID, UUID) TO service_role;

-- =====================================================================
-- END MIGRATION 006
-- =====================================================================
