import { NextRequest, NextResponse } from "next/server";
import {
  getTeacherCourseIds,
  requireTeacher,
  requireTeacherPermission,
  teacherService,
} from "@/lib/teacher/server";
import { parseZoomClassMode, saveZoomClassMode } from "@/lib/zoom/class-mode";

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
    const zoomMode = parseZoomClassMode(body?.zoomMode || "webinar");
    const capacity = Number(body?.capacity ?? (zoomMode === "meeting" ? 50 : 500));

    if (!title || !topic || !courseId || !startsAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "Title, topic, course and start time are required.",
        },
        { status: 400 }
      );
    }
    if (!zoomMode) return NextResponse.json({ ok: false, error: "Choose a Zoom meeting or webinar." }, { status: 400 });
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > (zoomMode === "meeting" ? 100 : 500)) return NextResponse.json({ ok: false, error: "Capacity exceeds the selected Zoom format." }, { status: 400 });

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

    const startTime = new Date(startsAt).getTime();
    const endTime = endsAt ? new Date(endsAt).getTime() : startTime + 60 * 60 * 1000;
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return NextResponse.json({ ok: false, error: "Choose a valid start and end time." }, { status: 400 });
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();

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

    try { await saveZoomClassMode(service, liveClass.id, zoomMode); }
    catch (modeError) { await service.from("live_classes").delete().eq("id", liveClass.id); throw modeError; }

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
