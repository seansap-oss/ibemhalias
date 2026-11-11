import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server-session";
import { requireTeacherForClass, teacherService } from "@/lib/teacher/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function studentForClass(classId: string) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) throw Object.assign(new Error("UNAUTHENTICATED"), { status: 401 });
  const service = teacherService();
  const { data: assignment } = await service
    .from("live_class_assignments")
    .select("id")
    .eq("live_class_id", classId)
    .eq("student_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!assignment) throw Object.assign(new Error("ACCESS_DENIED"), { status: 403 });
  const { data: profile } = await service
    .from("profiles")
    .select("id,full_name,student_code,email")
    .eq("id", user.id)
    .maybeSingle();
  return { service, userId: user.id, profile };
}

function errorResponse(error: any, fallback: string) {
  return NextResponse.json(
    { ok: false, error: error?.message || fallback },
    { status: Number(error?.status || 500) }
  );
}

export async function GET(request: NextRequest) {
  try {
    const classId = String(request.nextUrl.searchParams.get("classId") || "").trim();
    const mode = request.nextUrl.searchParams.get("mode") === "teacher" ? "teacher" : "student";
    if (!classId) return NextResponse.json({ ok: false, error: "classId required" }, { status: 400 });

    const service = teacherService();
    if (mode === "teacher") {
      await requireTeacherForClass(classId);
      const [{ data: questions }, { data: handRaises }, { count: attendanceCount }] = await Promise.all([
        service.from("live_class_questions").select("id,student_id,body,status,answered_at,created_at,profiles(full_name,student_code)").eq("live_class_id", classId).order("created_at", { ascending: false }).limit(80),
        service.from("live_class_hand_raises").select("id,student_id,status,requested_at,handled_at,profiles(full_name,student_code)").eq("live_class_id", classId).in("status", ["requested", "acknowledged", "allowed"]).order("requested_at", { ascending: true }).limit(80),
        service.from("live_class_attendance").select("id", { count: "exact", head: true }).eq("live_class_id", classId).eq("status", "present"),
      ]);
      return NextResponse.json({ ok: true, mode, questions: questions || [], handRaises: handRaises || [], attendanceCount: attendanceCount || 0 });
    }

    const student = await studentForClass(classId);
    const [{ data: questions }, { data: hand }, { data: attendance }] = await Promise.all([
      student.service.from("live_class_questions").select("id,body,status,answered_at,created_at").eq("live_class_id", classId).eq("student_id", student.userId).order("created_at", { ascending: false }).limit(50),
      student.service.from("live_class_hand_raises").select("id,status,requested_at,handled_at").eq("live_class_id", classId).eq("student_id", student.userId).in("status", ["requested", "acknowledged", "allowed"]).order("requested_at", { ascending: false }).maybeSingle(),
      student.service.from("live_class_attendance").select("status,first_join_at,watch_seconds").eq("live_class_id", classId).eq("student_id", student.userId).maybeSingle(),
    ]);
    return NextResponse.json({ ok: true, mode, profile: student.profile, questions: questions || [], handRaise: hand || null, attendance: attendance || null });
  } catch (error: any) { return errorResponse(error, "Unable to load live-class engagement."); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const classId = String(body?.classId || "").trim();
    const action = String(body?.action || "").trim();
    if (!classId) return NextResponse.json({ ok: false, error: "classId required" }, { status: 400 });
    const student = await studentForClass(classId);
    const now = new Date();

    if (action === "question") {
      const text = String(body?.body || "").trim().slice(0, 1200);
      if (!text) return NextResponse.json({ ok: false, error: "Write a question first." }, { status: 400 });
      const { data, error } = await student.service.from("live_class_questions").insert({ live_class_id: classId, student_id: student.userId, body: text }).select("id,body,status,created_at").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, question: data });
    }

    if (action === "raise_hand") {
      const { data: open } = await student.service.from("live_class_hand_raises").select("id,status,requested_at").eq("live_class_id", classId).eq("student_id", student.userId).in("status", ["requested", "acknowledged", "allowed"]).maybeSingle();
      if (open) return NextResponse.json({ ok: true, handRaise: open, alreadyRaised: true });
      const { data, error } = await student.service.from("live_class_hand_raises").insert({ live_class_id: classId, student_id: student.userId }).select("id,status,requested_at").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, handRaise: data });
    }

    if (!["join", "heartbeat", "leave"].includes(action)) return NextResponse.json({ ok: false, error: "Unknown engagement action." }, { status: 400 });
    const { data: existing } = await student.service.from("live_class_attendance").select("*").eq("live_class_id", classId).eq("student_id", student.userId).maybeSingle();
    const lastSeen = existing?.last_join_at ? new Date(existing.last_join_at) : now;
    const seconds = action === "join" ? 0 : Math.max(0, Math.min(120, Math.round((now.getTime() - lastSeen.getTime()) / 1000)));
    const row: Record<string, unknown> = {
      live_class_id: classId, student_id: student.userId, first_join_at: existing?.first_join_at || now.toISOString(),
      last_join_at: now.toISOString(), join_count: action === "join" ? Number(existing?.join_count || 0) + 1 : Number(existing?.join_count || 1),
      watch_seconds: Number(existing?.watch_seconds || 0) + seconds, status: "present", updated_at: now.toISOString(),
    };
    if (action === "leave") row.last_leave_at = now.toISOString();
    const { error } = await student.service.from("live_class_attendance").upsert(row, { onConflict: "live_class_id,student_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true, attendance: { status: "present", watchSeconds: row.watch_seconds } });
  } catch (error: any) { return errorResponse(error, "Unable to update live-class engagement."); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const classId = String(body?.classId || "").trim();
    const action = String(body?.action || "").trim();
    const id = String(body?.id || "").trim();
    if (!classId || !id) return NextResponse.json({ ok: false, error: "classId and id required" }, { status: 400 });
    const staff = await requireTeacherForClass(classId);
    const service = teacherService();
    if (action === "question") {
      const status = ["answered", "hidden"].includes(body?.status) ? body.status : "pending";
      const { error } = await service.from("live_class_questions").update({ status, answered_by: status === "answered" && !staff.id.startsWith("admin:") ? staff.id : null, answered_at: status === "answered" ? new Date().toISOString() : null }).eq("id", id).eq("live_class_id", classId);
      if (error) throw error;
    } else if (action === "hand") {
      const status = ["acknowledged", "allowed", "dismissed"].includes(body?.status) ? body.status : "requested";
      const { error } = await service.from("live_class_hand_raises").update({ status, handled_by: !staff.id.startsWith("admin:") ? staff.id : null, handled_at: new Date().toISOString() }).eq("id", id).eq("live_class_id", classId);
      if (error) throw error;
    } else return NextResponse.json({ ok: false, error: "Unknown moderation action." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error: any) { return errorResponse(error, "Unable to moderate live-class engagement."); }
}
