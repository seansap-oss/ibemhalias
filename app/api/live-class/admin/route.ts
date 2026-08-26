import { NextRequest, NextResponse } from "next/server";
import { adminError, liveService, normalizeIndianWhatsAppPhone, randomPassword, requireLiveAdmin, safeOrigin } from "@/lib/live-class/server";
import { sendWhatsAppTemplate, whatsappStatus } from "@/lib/live-class/whatsapp";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

async function overview(client: any) {
  const [{ data: classes, error: classError }, { count: studentCount }, { data: rooms }, { data: assignments }, { data: notifications }] = await Promise.all([
    client.from("live_classes").select("*").order("starts_at", { ascending: true }),
    client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    client.from("live_class_rooms").select("*").eq("is_active", true).order("capacity"),
    client.from("live_class_assignments").select("live_class_id,status").eq("status", "active"),
    client.from("live_class_notifications").select("status").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);
  if (classError) throw classError;

  const counts = new Map<string, number>();
  for (const row of assignments || []) counts.set(row.live_class_id, (counts.get(row.live_class_id) || 0) + 1);
  const roomMap = new Map<string, AnyRow>((rooms || []).map((r: AnyRow): [string, AnyRow] => [r.id, r]));
  const enriched = (classes || []).map((row: AnyRow) => ({
    ...row,
    assigned_count: counts.get(row.id) || 0,
    room_name: row.room_id ? roomMap.get(row.room_id)?.name || null : null,
  }));
  const sent = (notifications || []).filter((n: AnyRow) => n.status === "sent").length;
  const totalNotifications = (notifications || []).length;
  return {
    classes: enriched,
    stats: {
      totalClasses: enriched.length,
      totalStudents: studentCount || 0,
      liveNow: enriched.filter((x: AnyRow) => x.status === "live").length,
      upcoming: enriched.filter((x: AnyRow) => x.status === "scheduled").length,
      completed: enriched.filter((x: AnyRow) => x.status === "completed").length,
      reminderSuccess: totalNotifications ? Math.round((sent / totalNotifications) * 100) : 100,
    },
  };
}

async function schedule(client: any) {
  const [{ data: classes }, { data: rooms }, { data: courses }, { data: mappings }, { data: assignments }] = await Promise.all([
    client.from("live_classes").select("*").order("starts_at", { ascending: true }),
    client.from("live_class_rooms").select("*").eq("is_active", true).order("capacity"),
    client.from("courses").select("id,title,slug,is_published").eq("is_published", true).order("title"),
    client.from("live_class_course_access").select("live_class_id,course_id"),
    client.from("live_class_assignments").select("live_class_id,status").eq("status", "active"),
  ]);
  const counts = new Map<string, number>();
  for (const a of assignments || []) counts.set(a.live_class_id, (counts.get(a.live_class_id) || 0) + 1);
  return { classes: (classes || []).map((x: AnyRow) => ({ ...x, assigned_count: counts.get(x.id) || 0 })), rooms: rooms || [], courses: courses || [], mappings: mappings || [] };
}

async function students(client: any) {
  const [{ data: profiles, error }, { data: enrollments }, { data: courses }, { data: assignments }, { data: classes }] = await Promise.all([
    client.from("profiles").select("id,email,full_name,phone,student_code,whatsapp_opt_in,tier,created_at").eq("role", "student").order("created_at", { ascending: false }),
    client.from("enrollments").select("user_id,course_id,payment_status").eq("payment_status", "paid"),
    client.from("courses").select("id,title"),
    client.from("live_class_assignments").select("student_id,live_class_id,status").eq("status", "active"),
    client.from("live_classes").select("id,title,topic,starts_at,status"),
  ]);
  if (error) throw error;
  const courseMap = new Map<string, string>((courses || []).map((x: AnyRow): [string, string] => [x.id, String(x.title || "")]));
  const assignmentCount = new Map<string, number>();
  for (const a of assignments || []) assignmentCount.set(a.student_id, (assignmentCount.get(a.student_id) || 0) + 1);
  const packageMap = new Map<string, string[]>();
  for (const e of enrollments || []) {
    const names = packageMap.get(e.user_id) || [];
    const title = courseMap.get(e.course_id);
    if (title && !names.includes(title)) names.push(title);
    packageMap.set(e.user_id, names);
  }
  return {
    students: (profiles || []).map((s: AnyRow) => ({ ...s, package_names: packageMap.get(s.id) || [], assigned_count: assignmentCount.get(s.id) || 0 })),
    classes: classes || [],
    courses: courses || [],
  };
}

async function studentDetail(client: any, studentId: string) {
  const [{ data: student, error }, { data: enrollments }, { data: courses }, { data: assignments }, { data: classes }, { data: notifications }] = await Promise.all([
    client.from("profiles").select("id,email,full_name,phone,student_code,whatsapp_opt_in,tier,created_at").eq("id", studentId).single(),
    client.from("enrollments").select("id,user_id,course_id,payment_status,enrolled_at").eq("user_id", studentId),
    client.from("courses").select("id,title,slug,is_published").eq("is_published", true).order("title"),
    client.from("live_class_assignments").select("id,live_class_id,status,source,access_pass_id,created_at").eq("student_id", studentId),
    client.from("live_classes").select("id,title,topic,faculty_name,starts_at,ends_at,status,room_id").order("starts_at"),
    client.from("live_class_notifications").select("id,live_class_id,rule_type,scheduled_for,status,sent_at,last_error").eq("student_id", studentId).order("scheduled_for", { ascending: false }).limit(50),
  ]);
  if (error) throw error;
  return { student, enrollments: enrollments || [], courses: courses || [], assignments: assignments || [], classes: classes || [], notifications: notifications || [] };
}

async function rooms(client: any) {
  const [{ data: roomRows }, { data: classes }, { data: assignments }] = await Promise.all([
    client.from("live_class_rooms").select("*").order("capacity"),
    client.from("live_classes").select("id,title,topic,starts_at,ends_at,status,room_id,capacity").order("starts_at"),
    client.from("live_class_assignments").select("live_class_id,status").eq("status", "active"),
  ]);
  const counts = new Map<string, number>();
  for (const a of assignments || []) counts.set(a.live_class_id, (counts.get(a.live_class_id) || 0) + 1);
  return { rooms: roomRows || [], classes: (classes || []).map((x: AnyRow) => ({ ...x, assigned_count: counts.get(x.id) || 0 })) };
}

async function reminders(client: any) {
  const [{ data: rules }, { data: settings }, { data: notifications }, { data: classes }] = await Promise.all([
    client.from("live_class_reminder_rules").select("*").is("live_class_id", null).order("offset_minutes", { ascending: false }),
    client.from("live_class_settings").select("key,value"),
    client.from("live_class_notifications").select("id,student_id,live_class_id,rule_type,scheduled_for,status,sent_at,last_error,attempts").order("created_at", { ascending: false }).limit(100),
    client.from("live_classes").select("id,title,topic,starts_at,status").order("starts_at"),
  ]);
  const settingMap = Object.fromEntries((settings || []).map((s: AnyRow) => [s.key, s.value]));
  return { rules: rules || [], settings: settingMap, notifications: notifications || [], classes: classes || [], whatsapp: whatsappStatus() };
}

async function attendance(client: any) {
  const [{ data: rows }, { data: profiles }, { data: classes }] = await Promise.all([
    client.from("live_class_attendance").select("*").order("updated_at", { ascending: false }).limit(500),
    client.from("profiles").select("id,student_code,full_name,phone"),
    client.from("live_classes").select("id,title,topic,starts_at"),
  ]);
  return { attendance: rows || [], students: profiles || [], classes: classes || [] };
}

async function packages(client: any) {
  const [{ data: courses }, { data: classes }, { data: mappings }, { data: enrollments }] = await Promise.all([
    client.from("courses").select("id,title,slug,is_published,price_inr,discounted_price_inr").eq("is_published", true).order("title"),
    client.from("live_classes").select("id,title,topic,starts_at,status").order("starts_at"),
    client.from("live_class_course_access").select("live_class_id,course_id"),
    client.from("enrollments").select("course_id,user_id,payment_status").eq("payment_status", "paid"),
  ]);
  const enrolled = new Map<string, number>();
  for (const e of enrollments || []) enrolled.set(e.course_id, (enrolled.get(e.course_id) || 0) + 1);
  return { courses: (courses || []).map((c: AnyRow) => ({ ...c, enrolled_count: enrolled.get(c.id) || 0 })), classes: classes || [], mappings: mappings || [] };
}

async function classDetail(client: any, classId: string) {
  const [{ data: liveClass, error }, { data: rooms }, { data: courses }, { data: mappings }, { data: assignments }, { data: profiles }, { data: resources }, { data: attendanceRows }] = await Promise.all([
    client.from("live_classes").select("*").eq("id", classId).single(),
    client.from("live_class_rooms").select("*").eq("is_active", true).order("capacity"),
    client.from("courses").select("id,title,is_published").eq("is_published", true).order("title"),
    client.from("live_class_course_access").select("live_class_id,course_id").eq("live_class_id", classId),
    client.from("live_class_assignments").select("id,student_id,status,source,access_pass_id,created_at").eq("live_class_id", classId),
    client.from("profiles").select("id,student_code,full_name,email,phone,whatsapp_opt_in").eq("role", "student"),
    client.from("live_class_resources").select("*").eq("live_class_id", classId).order("sort_order"),
    client.from("live_class_attendance").select("*").eq("live_class_id", classId),
  ]);
  if (error) throw error;
  return { liveClass, rooms: rooms || [], courses: courses || [], mappings: mappings || [], assignments: assignments || [], students: profiles || [], resources: resources || [], attendance: attendanceRows || [] };
}

export async function GET(request: NextRequest) {
  try {
    await requireLiveAdmin();
    const client = liveService();
    const view = request.nextUrl.searchParams.get("view") || "overview";
    const studentId = request.nextUrl.searchParams.get("studentId") || "";
    const classId = request.nextUrl.searchParams.get("classId") || "";
    let data: any;
    if (view === "overview") data = await overview(client);
    else if (view === "schedule") data = await schedule(client);
    else if (view === "students") data = await students(client);
    else if (view === "student" && studentId) data = await studentDetail(client, studentId);
    else if (view === "classrooms") data = await rooms(client);
    else if (view === "reminders") data = await reminders(client);
    else if (view === "attendance") data = await attendance(client);
    else if (view === "packages") data = await packages(client);
    else if (view === "class" && classId) data = await classDetail(client, classId);
    else throw Object.assign(new Error("Unknown live-class admin view."), { status: 400 });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return adminError(error);
  }
}

async function autoAssignRooms(client: any) {
  const [{ data: roomRows, error: roomError }, { data: classes }, { data: assignments }] = await Promise.all([
    client.from("live_class_rooms").select("*").eq("is_active", true).order("capacity"),
    client.from("live_classes").select("id,title,starts_at,ends_at,status,room_id").in("status", ["scheduled", "live"]).order("starts_at"),
    client.from("live_class_assignments").select("live_class_id,status").eq("status", "active"),
  ]);
  if (roomError) throw roomError;
  const counts = new Map<string, number>();
  for (const a of assignments || []) counts.set(a.live_class_id, (counts.get(a.live_class_id) || 0) + 1);
  const allocated: AnyRow[] = [];
  for (const item of classes || []) {
    const count = counts.get(item.id) || 0;
    const start = new Date(item.starts_at).getTime();
    const end = new Date(item.ends_at || new Date(start + 90 * 60000).toISOString()).getTime();
    const candidates = (roomRows || []).filter((r: AnyRow) => Number(r.capacity || 0) >= count);
    let selected: AnyRow | undefined;
    for (const room of candidates) {
      const conflict = allocated.some((x) => x.room_id === room.id && start < x.end && end > x.start);
      if (!conflict) { selected = room; break; }
    }
    if (!selected && candidates.length) selected = candidates[candidates.length - 1];
    if (selected) {
      const { error } = await client.from("live_classes").update({ room_id: selected.id, capacity: Math.max(count, Number(item.capacity || 0)) }).eq("id", item.id);
      if (error) throw error;
      allocated.push({ class_id: item.id, class_title: item.title, room_id: selected.id, room_name: selected.name, count, start, end });
    }
  }
  return allocated;
}

async function savePackageMappings(client: any, courseId: string, classIds: string[]) {
  const { error: delError } = await client.from("live_class_course_access").delete().eq("course_id", courseId);
  if (delError) throw delError;
  if (classIds.length) {
    const { error } = await client.from("live_class_course_access").insert(classIds.map((liveClassId) => ({ course_id: courseId, live_class_id: liveClassId })));
    if (error) throw error;
  }
  for (const classId of classIds) await client.rpc("sync_live_class_assignments", { p_class_id: classId, p_student_id: null });
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireLiveAdmin();
    const body = await request.json();
    const action = String(body?.action || "");
    const client = liveService();

    if (action === "create_class") {
      const payload = {
        title: String(body.title || "").trim(),
        topic: String(body.topic || "").trim(),
        faculty_name: String(body.facultyName || "").trim(),
        starts_at: body.startsAt,
        ends_at: body.endsAt || null,
        status: body.status || "scheduled",
        capacity: Number(body.capacity || 500),
        room_id: body.roomId || null,
        timezone: "Asia/Kolkata",
      };
      if (!payload.title || !payload.topic || !payload.faculty_name || !payload.starts_at) throw Object.assign(new Error("Title, topic, faculty and start time are required."), { status: 400 });
      const { data, error } = await client.from("live_classes").insert(payload).select("*").single();
      if (error) throw error;
      const courseIds = Array.isArray(body.courseIds) ? body.courseIds.filter(Boolean) : [];
      if (courseIds.length) {
        const { error: mapError } = await client.from("live_class_course_access").insert(courseIds.map((courseId: string) => ({ live_class_id: data.id, course_id: courseId })));
        if (mapError) throw mapError;
      }
      await client.rpc("sync_live_class_assignments", { p_class_id: data.id, p_student_id: null });
      return NextResponse.json({ ok: true, liveClass: data });
    }

    if (action === "update_class") {
      const classId = String(body.classId || "");
      if (!classId) throw Object.assign(new Error("classId required"), { status: 400 });
      const allowed: AnyRow = {};
      for (const [key, source] of [["title", "title"], ["topic", "topic"], ["faculty_name", "facultyName"], ["starts_at", "startsAt"], ["ends_at", "endsAt"], ["status", "status"], ["room_id", "roomId"], ["recording_url", "recordingUrl"], ["join_url", "joinUrl"]] as any[]) {
        if (body[source] !== undefined) allowed[key] = body[source] || null;
      }
      if (body.capacity !== undefined) allowed.capacity = Number(body.capacity || 0);
      const { data, error } = await client.from("live_classes").update(allowed).eq("id", classId).select("*").single();
      if (error) throw error;
      if (body.recordingUrl) {
        const [{ data: rule }, { data: assigned }] = await Promise.all([
          client.from("live_class_reminder_rules").select("id,rule_type,enabled").is("live_class_id", null).eq("rule_type", "recording_ready").maybeSingle(),
          client.from("live_class_assignments").select("student_id").eq("live_class_id", classId).eq("status", "active"),
        ]);
        if (rule?.enabled && assigned?.length) {
          await client.from("live_class_notifications").upsert(assigned.map((a: any) => ({ live_class_id: classId, student_id: a.student_id, rule_id: rule.id, rule_type: "recording_ready", scheduled_for: new Date().toISOString(), status: "pending" })), { onConflict: "live_class_id,student_id,rule_type" });
        }
      }
      return NextResponse.json({ ok: true, liveClass: data });
    }

    if (action === "create_student") {
      const email = String(body.email || "").trim().toLowerCase();
      const fullName = String(body.fullName || "").trim();
      const phone = normalizeIndianWhatsAppPhone(body.phone);
      if (!email || !fullName || !phone) throw Object.assign(new Error("Name, email and phone are required."), { status: 400 });
      const password = String(body.password || randomPassword());
      const { data: created, error: authError } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, role: "student" } });
      if (authError) throw authError;
      if (!created.user) throw new Error("Student account was not created.");
      const { error: profileError } = await client.from("profiles").update({ full_name: fullName, phone, whatsapp_opt_in: body.whatsappOptIn !== false }).eq("id", created.user.id);
      if (profileError) throw profileError;
      const courseIds = Array.isArray(body.courseIds) ? body.courseIds.filter(Boolean) : [];
      if (courseIds.length) {
        const rows = courseIds.map((courseId: string) => ({ user_id: created.user.id, course_id: courseId, amount_paid: 0, enrolled_via: "admin_manual", payment_status: "paid", notes: `Created by ${admin.email || "admin"}` }));
        const { error } = await client.from("enrollments").upsert(rows, { onConflict: "user_id,course_id" });
        if (error) throw error;
      }
      await client.rpc("sync_live_class_assignments", { p_class_id: null, p_student_id: created.user.id });
      const { data: profile } = await client.from("profiles").select("id,student_code,full_name,email,phone").eq("id", created.user.id).single();
      return NextResponse.json({ ok: true, student: profile, temporaryPassword: password });
    }

    if (action === "update_student") {
      const studentId = String(body.studentId || "");
      const patch: AnyRow = {};
      if (body.fullName !== undefined) patch.full_name = String(body.fullName || "").trim();
      if (body.phone !== undefined) patch.phone = normalizeIndianWhatsAppPhone(body.phone);
      if (body.whatsappOptIn !== undefined) patch.whatsapp_opt_in = Boolean(body.whatsappOptIn);
      if (body.tier !== undefined) patch.tier = body.tier;
      const { data, error } = await client.from("profiles").update(patch).eq("id", studentId).select("id,student_code,full_name,email,phone,whatsapp_opt_in,tier").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, student: data });
    }

    if (action === "assign_classes") {
      const studentId = String(body.studentId || "");
      const classIds: string[] = Array.isArray(body.classIds) ? body.classIds.filter(Boolean) : [];
      if (!studentId || !classIds.length) throw Object.assign(new Error("Choose at least one class."), { status: 400 });
      const rows = classIds.map((liveClassId) => ({ live_class_id: liveClassId, student_id: studentId, source: "manual", status: "active", assigned_by_email: admin.email || "admin" }));
      const { error } = await client.from("live_class_assignments").upsert(rows, { onConflict: "live_class_id,student_id" });
      if (error) throw error;
      return NextResponse.json({ ok: true, assigned: classIds.length });
    }

    if (action === "revoke_class") {
      const { error } = await client.from("live_class_assignments").update({ status: "revoked" }).eq("student_id", body.studentId).eq("live_class_id", body.classId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "grant_package") {
      const row = { user_id: body.studentId, course_id: body.courseId, amount_paid: Number(body.amountPaid || 0), enrolled_via: "admin_manual", payment_status: "paid", notes: `Granted by ${admin.email || "admin"}` };
      const { error } = await client.from("enrollments").upsert(row, { onConflict: "user_id,course_id" });
      if (error) throw error;
      await client.rpc("sync_live_class_assignments", { p_class_id: null, p_student_id: body.studentId });
      return NextResponse.json({ ok: true });
    }

    if (action === "revoke_package") {
      const { error } = await client.from("enrollments").delete().eq("user_id", body.studentId).eq("course_id", body.courseId);
      if (error) throw error;
      await client.rpc("reconcile_live_class_assignments_for_student", { p_student_id: body.studentId });
      return NextResponse.json({ ok: true });
    }

    if (action === "create_room") {
      const name = String(body.name || "").trim();
      const capacity = Number(body.capacity || 0);
      if (!name || capacity < 1) throw Object.assign(new Error("Room name and capacity are required."), { status: 400 });
      const { data, error } = await client.from("live_class_rooms").insert({ name, capacity, provider: body.provider || "100ms", is_active: true }).select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, room: data });
    }

    if (action === "auto_assign_rooms") {
      return NextResponse.json({ ok: true, allocations: await autoAssignRooms(client) });
    }

    if (action === "save_reminder_rule") {
      const patch = {
        enabled: Boolean(body.enabled),
        message_template: String(body.messageTemplate || ""),
        whatsapp_template_name: String(body.whatsappTemplateName || ""),
      };
      const { data, error } = await client.from("live_class_reminder_rules").update(patch).eq("id", body.ruleId).select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, rule: data });
    }

    if (action === "save_automation") {
      const baseUrl = safeOrigin(body.baseUrl || request.headers.get("origin") || "");
      if (!baseUrl) throw Object.assign(new Error("A valid production URL is required."), { status: 400 });
      const { data: existing } = await client.from("live_class_settings").select("value").eq("key", "automation_secret").maybeSingle();
      const secret = existing?.value || `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const rows = [
        { key: "automation_base_url", value: baseUrl },
        { key: "automation_secret", value: secret },
        { key: "automation_enabled", value: body.enabled === false ? "false" : "true" },
      ];
      const { error } = await client.from("live_class_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      return NextResponse.json({ ok: true, baseUrl, enabled: body.enabled !== false });
    }

    if (action === "send_test") {
      const phone = normalizeIndianWhatsAppPhone(body.phone);
      if (!phone) throw Object.assign(new Error("Enter a WhatsApp phone number."), { status: 400 });
      const templateName = String(body.templateName || process.env.WHATSAPP_TEMPLATE_CLASS_REMINDER || "ibemhal_class_reminder");
      const result = await sendWhatsAppTemplate({ to: phone, templateName, studentName: body.studentName || "Test Student", classTitle: body.classTitle || "Ibemhal IAS Test Class", scheduleText: body.scheduleText || "Tomorrow at 10:00 AM", joinUrl: body.joinUrl || safeOrigin(request.headers.get("origin")) + "/live-classes" });
      return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : 503 });
    }

    if (action === "send_reminder_now") {
      const { data: student, error: sErr } = await client.from("profiles").select("id,full_name,phone").eq("id", body.studentId).single();
      const { data: liveClass, error: cErr } = await client.from("live_classes").select("id,title,topic,starts_at").eq("id", body.classId).single();
      if (sErr) throw sErr; if (cErr) throw cErr;
      const phone = normalizeIndianWhatsAppPhone(student.phone);
      const origin = safeOrigin(body.baseUrl || request.headers.get("origin"));
      const result = await sendWhatsAppTemplate({ to: phone, templateName: process.env.WHATSAPP_TEMPLATE_CLASS_REMINDER || "ibemhal_class_reminder", studentName: student.full_name, classTitle: `${liveClass.title} - ${liveClass.topic}`, scheduleText: new Date(liveClass.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), joinUrl: `${origin}/live-classes/${liveClass.id}` });
      return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : 503 });
    }

    if (action === "sync_assignments") {
      const { error } = await client.rpc("sync_live_class_assignments", { p_class_id: body.classId || null, p_student_id: body.studentId || null });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "map_package_classes") {
      const courseId = String(body.courseId || "");
      const classIds = Array.isArray(body.classIds) ? body.classIds.filter(Boolean) : [];
      if (!courseId) throw Object.assign(new Error("courseId required"), { status: 400 });
      await savePackageMappings(client, courseId, classIds);
      return NextResponse.json({ ok: true });
    }

    if (action === "mark_attendance") {
      const { error } = await client.from("live_class_attendance").upsert({ live_class_id: body.classId, student_id: body.studentId, status: body.status || "present", updated_at: new Date().toISOString() }, { onConflict: "live_class_id,student_id" });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    throw Object.assign(new Error(`Unknown live-class action: ${action}`), { status: 400 });
  } catch (error) {
    return adminError(error);
  }
}
