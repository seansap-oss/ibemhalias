import { NextRequest, NextResponse } from "next/server";
import {
  getTeacherCourseIds,
  requireTeacher,
  requireTeacherPermission,
  teacherService,
} from "@/lib/teacher/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const staff = await requireTeacher();
    const service = teacherService();
    const courseIds = await getTeacherCourseIds(staff);

    const { data: courses, error } = courseIds.length
      ? await service
          .from("courses")
          .select("id,title,slug,is_published,instructor_id")
          .in("id", courseIds)
          .order("title")
      : { data: [] as any[], error: null };

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      staff,
      courses: courses || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to load teacher courses." },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireTeacher();
    await requireTeacherPermission("can_schedule_classes", staff);

    const service = teacherService();
    const body = await request.json();
    const title = String(body?.title || "").trim();
    const topic = String(body?.topic || "").trim();
    const courseId = String(body?.courseId || "").trim();
    const startsAt = String(body?.startsAt || "").trim();
    const endsAt = String(body?.endsAt || "").trim();
    const capacity = Math.max(1, Math.min(1000, Number(body?.capacity || 500)));

    if (!title || !topic || !courseId || !startsAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "Title, topic, course and start time are required.",
        },
        { status: 400 }
      );
    }

    const allowedCourseIds = await getTeacherCourseIds(staff);
    if (!allowedCourseIds.includes(courseId)) {
      return NextResponse.json(
        { ok: false, error: "COURSE_NOT_ASSIGNED_TO_TEACHER" },
        { status: 403 }
      );
    }

    const provider =
      String(process.env.NEXT_PUBLIC_LIVE_NOW_PROVIDER || "").toLowerCase() ===
      "zoom"
        ? "zoom"
        : "livekit";

    const startIso = new Date(startsAt).toISOString();
    const endIso = endsAt
      ? new Date(endsAt).toISOString()
      : new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();

    const { data: liveClass, error } = await service
      .from("live_classes")
      .insert({
        title,
        topic,
        faculty_name: staff.fullName,
        provider,
        status: "scheduled",
        starts_at: startIso,
        ends_at: endIso,
        capacity,
        timezone: "Asia/Kolkata",
      })
      .select("*")
      .single();

    if (error) throw error;

    const { error: mappingError } = await service
      .from("live_class_course_access")
      .insert({
        live_class_id: liveClass.id,
        course_id: courseId,
      });

    if (mappingError) {
      await service.from("live_classes").delete().eq("id", liveClass.id);
      throw mappingError;
    }

    await service.rpc("sync_live_class_assignments", {
      p_class_id: liveClass.id,
      p_student_id: null,
    });

    return NextResponse.json({ ok: true, liveClass });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to schedule class." },
      { status: Number(error?.status || 500) }
    );
  }
}
