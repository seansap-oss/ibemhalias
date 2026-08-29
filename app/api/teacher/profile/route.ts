import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server-session";
import {
  getTeacherCourseIds,
  getTeacherPermissions,
  requireTeacher,
  teacherService,
} from "@/lib/teacher/server";
import { isMissingTeacherCrmTable, pickTeacherProfile } from "@/lib/teacher/crm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const staff = await requireTeacher();
    const service = teacherService();

    if (staff.role === "admin") {
      return NextResponse.json({
        ok: true,
        adminPreview: true,
        staff,
        profile: null,
        teacherProfile: null,
        permissions: await getTeacherPermissions(staff),
        courses: [],
      });
    }

    const courseIds = await getTeacherCourseIds(staff);

    const [
      { data: profile, error: profileError },
      { data: teacherProfile, error: crmError },
      { data: courses, error: courseError },
    ] = await Promise.all([
      service
        .from("profiles")
        .select("id,email,full_name,phone,avatar_url,created_at")
        .eq("id", staff.id)
        .single(),
      service
        .from("teacher_profiles")
        .select("*")
        .eq("teacher_id", staff.id)
        .maybeSingle(),
      courseIds.length
        ? service
            .from("courses")
            .select("id,title,slug,category,level,is_published")
            .in("id", courseIds)
            .order("title")
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    if (profileError) throw profileError;
    if (crmError) throw crmError;
    if (courseError) throw courseError;

    return NextResponse.json({
      ok: true,
      staff,
      profile,
      teacherProfile,
      permissions: await getTeacherPermissions(staff),
      courses: courses || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to load teacher profile.",
        migrationRequired: isMissingTeacherCrmTable(error),
      },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const staff = await requireTeacher();
    if (staff.role !== "instructor") {
      throw Object.assign(
        new Error("Use Admin Teacher Management to edit administrator data."),
        { status: 403 }
      );
    }

    const service = teacherService();
    const body = await request.json();
    const action = String(body?.action || "update_contact");

    if (action === "change_password") {
      const password = String(body?.password || "");
      if (password.length < 8) {
        throw Object.assign(
          new Error("New password must be at least 8 characters."),
          { status: 400 }
        );
      }

      const session = await createSessionClient();
      const { error } = await session.auth.updateUser({ password });
      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    const core = body?.profile || {};
    const extended = body?.teacherProfile || {};

    const { error: coreError } = await service
      .from("profiles")
      .update({
        phone: String(core?.phone || "").trim() || null,
        avatar_url: String(core?.avatar_url || "").trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staff.id);
    if (coreError) throw coreError;

    const existing = await service
      .from("teacher_profiles")
      .select("staff_code,qualification,specialization,joining_date,employment_status")
      .eq("teacher_id", staff.id)
      .maybeSingle();

    if (existing.error) throw existing.error;

    const safe = pickTeacherProfile({
      ...extended,
      qualification: existing.data?.qualification || extended?.qualification,
      specialization: existing.data?.specialization || extended?.specialization,
      joining_date: existing.data?.joining_date || extended?.joining_date,
      employment_status: existing.data?.employment_status || "active",
    });

    const { error: crmError } = await service.from("teacher_profiles").upsert(
      {
        teacher_id: staff.id,
        staff_code: existing.data?.staff_code || null,
        ...safe,
      },
      { onConflict: "teacher_id" }
    );
    if (crmError) throw crmError;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to update teacher profile.",
        migrationRequired: isMissingTeacherCrmTable(error),
      },
      { status: Number(error?.status || 500) }
    );
  }
}
