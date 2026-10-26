-- =====================================================================
-- IBEMHAL IAS LMS — MIGRATION 015: TEACHER WORKSPACE + MATERIAL LEDGER
-- Teacher uploads are stored in the institute workspace first. Google Drive
-- folder mapping is deliberately configuration-only until the institute
-- connects its Drive credentials on the server.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.teacher_storage_settings (
  teacher_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_drive_folder_url TEXT,
  google_drive_folder_name TEXT,
  local_backup_label TEXT NOT NULL DEFAULT 'IBEMHAL_DATA / teacher-materials',
  drive_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_workspace_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  material_type TEXT NOT NULL DEFAULT 'study_note',
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  local_backup_status TEXT NOT NULL DEFAULT 'queued',
  google_drive_status TEXT NOT NULL DEFAULT 'not_configured',
  google_drive_file_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_workspace_materials_teacher_created
  ON public.teacher_workspace_materials(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_workspace_materials_course
  ON public.teacher_workspace_materials(course_id);

DROP TRIGGER IF EXISTS trg_teacher_storage_settings_updated_at ON public.teacher_storage_settings;
CREATE TRIGGER trg_teacher_storage_settings_updated_at
BEFORE UPDATE ON public.teacher_storage_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_teacher_workspace_materials_updated_at ON public.teacher_workspace_materials;
CREATE TRIGGER trg_teacher_workspace_materials_updated_at
BEFORE UPDATE ON public.teacher_workspace_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.teacher_storage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_workspace_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_storage_settings_select_own" ON public.teacher_storage_settings;
CREATE POLICY "teacher_storage_settings_select_own"
ON public.teacher_storage_settings FOR SELECT TO authenticated
USING ((select auth.uid()) = teacher_id);

DROP POLICY IF EXISTS "teacher_storage_settings_admin_all" ON public.teacher_storage_settings;
CREATE POLICY "teacher_storage_settings_admin_all"
ON public.teacher_storage_settings FOR ALL TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));

DROP POLICY IF EXISTS "teacher_workspace_materials_select_own" ON public.teacher_workspace_materials;
CREATE POLICY "teacher_workspace_materials_select_own"
ON public.teacher_workspace_materials FOR SELECT TO authenticated
USING ((select auth.uid()) = teacher_id);

DROP POLICY IF EXISTS "teacher_workspace_materials_insert_own" ON public.teacher_workspace_materials;
CREATE POLICY "teacher_workspace_materials_insert_own"
ON public.teacher_workspace_materials FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = teacher_id);

DROP POLICY IF EXISTS "teacher_workspace_materials_admin_all" ON public.teacher_workspace_materials;
CREATE POLICY "teacher_workspace_materials_admin_all"
ON public.teacher_workspace_materials FOR ALL TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));

INSERT INTO public.teacher_storage_settings (teacher_id)
SELECT id FROM public.profiles WHERE role = 'instructor'
ON CONFLICT (teacher_id) DO NOTHING;
