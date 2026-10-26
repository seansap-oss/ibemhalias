import { NextRequest, NextResponse } from "next/server";
import {
  getTeacherCourseIds,
  requireTeacher,
  requireTeacherPermission,
  teacherService,
} from "@/lib/teacher/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "cms-content";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "material";
}

function displayTitle(value: FormDataEntryValue | null, fallback: string) {
  const title = String(value || "").trim();
  return title.slice(0, 180) || fallback.replace(/\.[^/.]+$/, "");
}

function apiError(error: any) {
  const message = String(error?.message || "Unable to load teacher workspace.");
  const status = Number(error?.status || 500);
  const migrationRequired = /teacher_storage_settings|teacher_workspace_materials|schema cache|does not exist/i.test(message);
  return NextResponse.json({ ok: false, error: message, migrationRequired }, { status });
}

export async function GET() {
  try {
    const staff = await requireTeacher();
    const service = teacherService();
    const courseIds = await getTeacherCourseIds(staff);
    const teacherFilter = staff.role === "admin" ? null : staff.id;

    const [courseResult, materialResult, storageResult] = await Promise.all([
      courseIds.length
        ? service
            .from("courses")
            .select("id,title,slug")
            .in("id", courseIds)
            .order("title")
        : Promise.resolve({ data: [], error: null }),
      teacherFilter
        ? service
            .from("teacher_workspace_materials")
            .select("id,course_id,title,material_type,file_name,mime_type,file_size,storage_path,local_backup_status,google_drive_status,created_at")
            .eq("teacher_id", teacherFilter)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      teacherFilter
        ? service
            .from("teacher_storage_settings")
            .select("google_drive_folder_url,google_drive_folder_name,local_backup_label,drive_sync_enabled,updated_at")
            .eq("teacher_id", teacherFilter)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (courseResult.error) throw courseResult.error;
    if (materialResult.error) throw materialResult.error;
    if (storageResult.error) throw storageResult.error;

    return NextResponse.json({
      ok: true,
      staff,
      courses: courseResult.data || [],
      materials: materialResult.data || [],
      storage: storageResult.data || {
        google_drive_folder_url: null,
        google_drive_folder_name: null,
        local_backup_label: "IBEMHAL_DATA / teacher-materials",
        drive_sync_enabled: false,
      },
      localBackupNote:
        "Local backup runs from the office/admin PC through Local Data Vault. Vercel stores the protected institute copy and cannot write to an office drive directly.",
    });
  } catch (error: any) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireTeacherPermission("can_upload_materials");
    if (staff.role !== "instructor") {
      throw Object.assign(new Error("Administrator preview cannot upload as a teacher."), { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const courseId = String(form.get("courseId") || "").trim();
    const materialType = String(form.get("materialType") || "study_note").trim().slice(0, 80);

    if (!(file instanceof File) || !file.size) {
      throw Object.assign(new Error("Choose a material file to upload."), { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      throw Object.assign(new Error("Files must be 50 MB or smaller."), { status: 400 });
    }

    const service = teacherService();
    const courseIds = await getTeacherCourseIds(staff);
    if (courseId && !courseIds.includes(courseId)) {
      throw Object.assign(new Error("That course is not assigned to this teacher."), { status: 403 });
    }

    const cleanName = safeName(file.name);
    const storagePath = `teacher-materials/${staff.id}/${Date.now()}-${cleanName}`;
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: settings, error: settingsError } = await service
      .from("teacher_storage_settings")
      .select("google_drive_folder_url,drive_sync_enabled")
      .eq("teacher_id", staff.id)
      .maybeSingle();
    if (settingsError) throw settingsError;

    const driveStatus = settings?.drive_sync_enabled && settings?.google_drive_folder_url
      ? "ready_to_sync"
      : settings?.google_drive_folder_url
        ? "folder_assigned"
        : "not_configured";

    const { data, error: insertError } = await service
      .from("teacher_workspace_materials")
      .insert({
        teacher_id: staff.id,
        course_id: courseId || null,
        title: displayTitle(form.get("title"), file.name),
        material_type: materialType || "study_note",
        file_name: cleanName,
        mime_type: file.type || null,
        file_size: file.size,
        storage_path: storagePath,
        local_backup_status: "queued",
        google_drive_status: driveStatus,
      })
      .select("id,course_id,title,material_type,file_name,mime_type,file_size,storage_path,local_backup_status,google_drive_status,created_at")
      .single();

    if (insertError) {
      await service.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);
      throw insertError;
    }

    await service.from("teacher_activity_log").insert({
      teacher_id: staff.id,
      action: "workspace_material_uploaded",
      details: { materialId: data.id, title: data.title, courseId: courseId || null },
    });

    return NextResponse.json({ ok: true, material: data });
  } catch (error: any) {
    return apiError(error);
  }
}
