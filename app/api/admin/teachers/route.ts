import { NextRequest, NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { requireCmsAdmin } from "@/lib/supabase/server-session";
import {
  DEFAULT_TEACHER_PERMISSIONS,
  fallbackStaffCode,
  isMissingTeacherCrmTable,
  pickTeacherPermissions,
  pickTeacherProfile,
  temporaryPassword,
} from "@/lib/teacher/crm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function actorId(admin: any) {
  const value = String(admin?.id || "");
  return value && !value.startsWith("admin:") ? value : null;
}

async function audit(
  service: any,
  teacherId: string,
  action: string,
  details: Record<string, unknown>,
  admin: any
) {
  await service.from("teacher_activity_log").insert({
    teacher_id: teacherId,
    action,
    details,
    created_by: actorId(admin),
  });
}

async function readDirectory(service: any) {
  const [{ data: teachers, error }, { data: courses, error: courseError }] =
    await Promise.all([
      service
        .from("profiles")
        .select("id,email,full_name,phone,avatar_url,role,created_at")
        .eq("role", "instructor")
        .order("full_name"),
      service
        .from("courses")
        .select(
          "id,title,slug,instructor_id,is_published,category,level,short_tagline"
        )
        .order("title"),
    ]);

  if (error) throw error;
  if (courseError) throw courseError;

  const teacherIds = (teachers || []).map((row: any) => String(row.id));
  let details: any[] = [];
  let permissions: any[] = [];
  let notes: any[] = [];
  let activity: any[] = [];
  let migrationRequired = false;

  if (teacherIds.length) {
    const [detailResult, permissionResult, noteResult, activityResult] =
      await Promise.all([
        service.from("teacher_profiles").select("*").in("teacher_id", teacherIds),
        service
          .from("teacher_permissions")
          .select("*")
          .in("teacher_id", teacherIds),
        service
          .from("teacher_notes")
          .select("*")
          .in("teacher_id", teacherIds)
          .order("created_at", { ascending: false }),
        service
          .from("teacher_activity_log")
          .select("*")
          .in("teacher_id", teacherIds)
          .order("created_at", { ascending: false }),
      ]);

    const errors = [
      detailResult.error,
      permissionResult.error,
      noteResult.error,
      activityResult.error,
    ].filter(Boolean);

    if (errors.some(isMissingTeacherCrmTable)) {
      migrationRequired = true;
    } else if (errors.length) {
      throw errors[0];
    } else {
      details = detailResult.data || [];
      permissions = permissionResult.data || [];
      notes = noteResult.data || [];
      activity = activityResult.data || [];
    }
  }

  const detailMap = new Map(
    details.map((row: any) => [String(row.teacher_id), row])
  );
  const permissionMap = new Map(
    permissions.map((row: any) => [String(row.teacher_id), row])
  );

  return {
    teachers: (teachers || []).map((teacher: any) => {
      const id = String(teacher.id);
      return {
        ...teacher,
        teacher_profile: detailMap.get(id) || {
          teacher_id: id,
          staff_code: fallbackStaffCode(id),
          employment_status: "active",
          country: "India",
        },
        permissions: {
          ...DEFAULT_TEACHER_PERMISSIONS,
          ...(permissionMap.get(id) || {}),
        },
        course_ids: (courses || [])
          .filter((course: any) => String(course.instructor_id || "") === id)
          .map((course: any) => String(course.id)),
        notes: notes.filter((note: any) => String(note.teacher_id) === id),
        activity: activity
          .filter((item: any) => String(item.teacher_id) === id)
          .slice(0, 50),
      };
    }),
    courses: courses || [],
    migrationRequired,
  };
}

export async function GET() {
  try {
    await requireCmsAdmin();
    const service = createCmsServiceClient();
    const data = await readDirectory(service);

    return NextResponse.json({
      ok: true,
      ...data,
      migration: {
        file: "supabase/migrations/014_teacher_crm_staff_database.sql",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to load Teacher CRM." },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireCmsAdmin();
    const service = createCmsServiceClient();
    const body = await request.json();

    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const suppliedPassword = String(body?.password || "");
    const password = suppliedPassword || temporaryPassword();
    const phone = String(body?.phone || "").trim() || null;
    const avatarUrl = String(body?.avatar_url || "").trim() || null;
    const courseIds = Array.isArray(body?.courseIds)
      ? body.courseIds.map((value: any) => String(value)).filter(Boolean)
      : [];

    if (!fullName || !email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Teacher name and a valid email are required." },
        { status: 400 }
      );
    }

    if (courseIds.length) {
      const { data: validCourses, error } = await service
        .from("courses")
        .select("id")
        .in("id", courseIds);
      if (error) throw error;

      if ((validCourses || []).length !== courseIds.length) {
        return NextResponse.json(
          { ok: false, error: "One or more selected courses do not exist." },
          { status: 400 }
        );
      }
    }

    const { data: created, error: createError } =
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: "instructor",
        },
        app_metadata: {
          role: "instructor",
        },
      });

    if (createError || !created.user) {
      throw createError || new Error("Unable to create teacher login.");
    }

    const teacherId = created.user.id;

    try {
      const { error: profileError } = await service.from("profiles").upsert(
        {
          id: teacherId,
          email,
          full_name: fullName,
          role: "instructor",
          tier: "all-access",
          phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;

      const { error: crmError } = await service
        .from("teacher_profiles")
        .upsert(
          {
            teacher_id: teacherId,
            staff_code:
              String(body?.teacherProfile?.staff_code || "").trim() ||
              fallbackStaffCode(teacherId),
            ...pickTeacherProfile(body?.teacherProfile || {}),
          },
          { onConflict: "teacher_id" }
        );
      if (crmError) throw crmError;

      const { error: permissionError } = await service
        .from("teacher_permissions")
        .upsert(
          {
            teacher_id: teacherId,
            ...pickTeacherPermissions(body?.permissions || {}),
          },
          { onConflict: "teacher_id" }
        );
      if (permissionError) throw permissionError;

      if (courseIds.length) {
        const { error: courseError } = await service
          .from("courses")
          .update({
            instructor_id: teacherId,
            updated_at: new Date().toISOString(),
          })
          .in("id", courseIds);
        if (courseError) throw courseError;
      }

      await audit(
        service,
        teacherId,
        "teacher_created",
        { courseIds },
        admin
      );

      return NextResponse.json({
        ok: true,
        teacherId,
        temporaryPassword: suppliedPassword ? null : password,
      });
    } catch (error) {
      await service.auth.admin.deleteUser(teacherId).catch(() => undefined);
      throw error;
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to create teacher account.",
        migrationRequired: isMissingTeacherCrmTable(error),
      },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireCmsAdmin();
    const service = createCmsServiceClient();
    const body = await request.json();
    const teacherId = String(body?.teacherId || "").trim();
    const action = String(body?.action || "").trim();

    if (!teacherId || !action) {
      return NextResponse.json(
        { ok: false, error: "teacherId and action are required." },
        { status: 400 }
      );
    }

    if (action === "update_profile") {
      const profile = body?.profile || {};
      const fullName = String(profile?.full_name || "").trim();
      const phone = String(profile?.phone || "").trim() || null;
      const avatarUrl = String(profile?.avatar_url || "").trim() || null;

      const updateCore: Record<string, any> = {
        phone,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };
      if (fullName) updateCore.full_name = fullName;

      const { error: coreError } = await service
        .from("profiles")
        .update(updateCore)
        .eq("id", teacherId);
      if (coreError) throw coreError;

      const { error: crmError } = await service.from("teacher_profiles").upsert(
        {
          teacher_id: teacherId,
          staff_code:
            String(profile?.staff_code || "").trim() ||
            fallbackStaffCode(teacherId),
          ...pickTeacherProfile(profile),
        },
        { onConflict: "teacher_id" }
      );
      if (crmError) throw crmError;

      await audit(service, teacherId, "profile_updated", {}, admin);
    } else if (action === "assign_courses") {
      const courseIds = Array.isArray(body?.courseIds)
        ? body.courseIds.map((value: any) => String(value)).filter(Boolean)
        : [];

      const { error: clearError } = await service
        .from("courses")
        .update({
          instructor_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("instructor_id", teacherId);
      if (clearError) throw clearError;

      if (courseIds.length) {
        const { data: validCourses, error: validError } = await service
          .from("courses")
          .select("id")
          .in("id", courseIds);
        if (validError) throw validError;

        if ((validCourses || []).length !== courseIds.length) {
          throw Object.assign(
            new Error("One or more selected courses do not exist."),
            { status: 400 }
          );
        }

        const { error: assignError } = await service
          .from("courses")
          .update({
            instructor_id: teacherId,
            updated_at: new Date().toISOString(),
          })
          .in("id", courseIds);
        if (assignError) throw assignError;
      }

      await audit(
        service,
        teacherId,
        "courses_assigned",
        { courseIds },
        admin
      );
    } else if (action === "update_permissions") {
      const permissions = pickTeacherPermissions(body?.permissions || {});
      const { error } = await service.from("teacher_permissions").upsert(
        { teacher_id: teacherId, ...permissions },
        { onConflict: "teacher_id" }
      );
      if (error) throw error;

      await audit(
        service,
        teacherId,
        "permissions_updated",
        permissions,
        admin
      );
    } else if (action === "add_note") {
      const note = String(body?.note || "").trim();
      if (!note) {
        throw Object.assign(new Error("Note cannot be empty."), { status: 400 });
      }

      const { error } = await service.from("teacher_notes").insert({
        teacher_id: teacherId,
        note,
        category: String(body?.category || "general"),
        priority: String(body?.priority || "normal"),
        follow_up_date: body?.follow_up_date || null,
        is_private: true,
        created_by: actorId(admin),
      });
      if (error) throw error;

      await audit(service, teacherId, "note_added", {}, admin);
    } else if (action === "reset_password") {
      const password =
        String(body?.password || "").trim() || temporaryPassword();

      if (password.length < 8) {
        throw Object.assign(
          new Error("Password must be at least 8 characters."),
          { status: 400 }
        );
      }

      const { error } = await service.auth.admin.updateUserById(teacherId, {
        password,
      });
      if (error) throw error;

      await audit(service, teacherId, "password_reset", {}, admin);

      return NextResponse.json({
        ok: true,
        temporaryPassword: password,
      });
    } else if (action === "set_status") {
      const status = String(body?.status || "active").toLowerCase();
      const active = status === "active";

      const { error: profileError } = await service
        .from("teacher_profiles")
        .upsert(
          {
            teacher_id: teacherId,
            staff_code: fallbackStaffCode(teacherId),
            employment_status: active ? "active" : status,
          },
          { onConflict: "teacher_id" }
        );
      if (profileError) throw profileError;

      const { error: authError } = await service.auth.admin.updateUserById(
        teacherId,
        {
          ban_duration: active ? "none" : "876000h",
        }
      );
      if (authError) throw authError;

      await audit(
        service,
        teacherId,
        active ? "teacher_reactivated" : "teacher_deactivated",
        { status },
        admin
      );
    } else {
      throw Object.assign(new Error("Unknown Teacher CRM action."), {
        status: 400,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to update Teacher CRM.",
        migrationRequired: isMissingTeacherCrmTable(error),
      },
      { status: Number(error?.status || 500) }
    );
  }
}
