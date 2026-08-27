import { NextRequest, NextResponse } from "next/server";
import {
  adminError,
  liveService,
  normalizeIndianWhatsAppPhone,
  randomPassword,
  requireLiveAdmin,
  safeOrigin,
} from "@/lib/live-class/server";
import { sendWhatsAppTemplate } from "@/lib/live-class/whatsapp";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

const DEFAULT_FLAGS = {
  detailed_study_notes: false,
  premium_lectures: false,
  premium_test_series: false,
  mentor_notes: false,
};

function cleanPaymentSource(value: unknown) {
  const allowed = new Set([
    "cash_counter",
    "phone_booking",
    "manual_admin",
    "online_gateway",
  ]);
  const result = String(value || "cash_counter");
  return allowed.has(result) ? result : "cash_counter";
}

async function loadData(client: any) {
  const [
    { data: profiles, error: profileError },
    { data: enrollments, error: enrollmentError },
    { data: courses, error: courseError },
    { data: assignments, error: assignmentError },
    { data: classes, error: classError },
    { data: prefs, error: prefError },
  ] = await Promise.all([
    client
      .from("profiles")
      .select("id,email,full_name,phone,student_code,whatsapp_opt_in,tier,created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false }),
    client
      .from("enrollments")
      .select("user_id,course_id,payment_status,enrolled_via,enrolled_at")
      .eq("payment_status", "paid"),
    client
      .from("courses")
      .select("id,title")
      .order("title"),
    client
      .from("live_class_assignments")
      .select("student_id,live_class_id,status")
      .eq("status", "active"),
    client
      .from("live_classes")
      .select("id,title,topic,starts_at,status")
      .order("starts_at"),
    client
      .from("student_access_preferences")
      .select("*"),
  ]);

  if (profileError) throw profileError;
  if (enrollmentError) throw enrollmentError;
  if (courseError) throw courseError;
  if (assignmentError) throw assignmentError;
  if (classError) throw classError;
  if (prefError) throw prefError;

  const { data: authPage, error: authListError } =
    await client.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (authListError) throw authListError;

  const authMap = new Map<string, any>(
    (authPage?.users || []).map((user: any) => [user.id, user])
  );

  const courseMap = new Map<string, string>(
    (courses || []).map((course: AnyRow) => [course.id, course.title])
  );
  const packageIds = new Map<string, string[]>();
  const packageNames = new Map<string, string[]>();
  const paymentSource = new Map<string, string>();

  for (const enrollment of enrollments || []) {
    const ids = packageIds.get(enrollment.user_id) || [];
    if (!ids.includes(enrollment.course_id)) ids.push(enrollment.course_id);
    packageIds.set(enrollment.user_id, ids);

    const names = packageNames.get(enrollment.user_id) || [];
    const title = courseMap.get(enrollment.course_id);
    if (title && !names.includes(title)) names.push(title);
    packageNames.set(enrollment.user_id, names);

    if (!paymentSource.has(enrollment.user_id)) {
      paymentSource.set(
        enrollment.user_id,
        enrollment.enrolled_via || "cash_counter"
      );
    }
  }

  const assignedIds = new Map<string, string[]>();
  for (const assignment of assignments || []) {
    const ids = assignedIds.get(assignment.student_id) || [];
    if (!ids.includes(assignment.live_class_id)) {
      ids.push(assignment.live_class_id);
    }
    assignedIds.set(assignment.student_id, ids);
  }

  const prefMap = new Map<string, AnyRow>(
    (prefs || []).map((pref: AnyRow) => [pref.student_id, pref])
  );

  const students = (profiles || []).map((profile: AnyRow) => {
    const preference = prefMap.get(profile.id);
    const authUser = authMap.get(profile.id);
    const bannedUntil = authUser?.banned_until
      ? Date.parse(authUser.banned_until)
      : 0;
    const accountStatus =
      bannedUntil && bannedUntil > Date.now() ? "inactive" : "active";

    return {
      ...profile,
      account_status: accountStatus,
      batch: String(authUser?.user_metadata?.batch || ""),
      package_ids: packageIds.get(profile.id) || [],
      package_names: packageNames.get(profile.id) || [],
      assigned_class_ids: assignedIds.get(profile.id) || [],
      assigned_count: assignedIds.get(profile.id)?.length || 0,
      payment_source:
        preference?.payment_source ||
        paymentSource.get(profile.id) ||
        "cash_counter",
      preferences: preference
        ? {
            reminder_day_before: preference.reminder_day_before,
            reminder_hour_before: preference.reminder_hour_before,
            sms_enabled: preference.sms_enabled,
            material_flags: {
              ...DEFAULT_FLAGS,
              ...(preference.material_flags || {}),
            },
          }
        : {
            reminder_day_before: true,
            reminder_hour_before: true,
            sms_enabled: false,
            material_flags: DEFAULT_FLAGS,
          },
    };
  });

  return {
    students,
    courses: courses || [],
    classes: classes || [],
  };
}

export async function GET() {
  try {
    await requireLiveAdmin();
    const client = liveService();
    const data = await loadData(client);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return adminError(error);
  }
}

async function saveAssignment(
  client: any,
  adminEmail: string,
  body: AnyRow
) {
  const studentId = String(body.studentId || "");
  if (!studentId) {
    throw Object.assign(new Error("studentId required"), { status: 400 });
  }

  const packageIds = Array.isArray(body.packageIds)
    ? body.packageIds.filter(Boolean)
    : [];
  const classIds = Array.isArray(body.classIds)
    ? body.classIds.filter(Boolean)
    : [];
  const paymentSource = cleanPaymentSource(body.paymentSource);
  const tier = ["free", "premium", "all-access"].includes(String(body.tier))
    ? String(body.tier)
    : "free";

  const { data: currentEnrollments, error: enrollmentReadError } =
    await client
      .from("enrollments")
      .select("course_id")
      .eq("user_id", studentId);

  if (enrollmentReadError) throw enrollmentReadError;

  const currentCourseIds = (currentEnrollments || []).map(
    (row: AnyRow) => row.course_id
  );
  const removeCourses = currentCourseIds.filter(
    (courseId: string) => !packageIds.includes(courseId)
  );

  if (removeCourses.length) {
    const { error } = await client
      .from("enrollments")
      .delete()
      .eq("user_id", studentId)
      .in("course_id", removeCourses);
    if (error) throw error;
  }

  if (packageIds.length) {
    const rows = packageIds.map((courseId: string) => ({
      user_id: studentId,
      course_id: courseId,
      amount_paid: 0,
      enrolled_via: paymentSource,
      payment_status: "paid",
      notes: `Assigned by ${adminEmail || "admin"} via ${paymentSource}`,
    }));

    const { error } = await client
      .from("enrollments")
      .upsert(rows, { onConflict: "user_id,course_id" });

    if (error) throw error;
  }

  const { error: revokeError } = await client
    .from("live_class_assignments")
    .update({ status: "revoked" })
    .eq("student_id", studentId)
    .eq("status", "active");

  if (revokeError) throw revokeError;

  if (classIds.length) {
    const rows = classIds.map((liveClassId: string) => ({
      live_class_id: liveClassId,
      student_id: studentId,
      source: "manual",
      status: "active",
      assigned_by_email: adminEmail || "admin",
    }));

    const { error } = await client
      .from("live_class_assignments")
      .upsert(rows, { onConflict: "live_class_id,student_id" });

    if (error) throw error;
  }

  const { error: profileError } = await client
    .from("profiles")
    .update({
      tier,
      whatsapp_opt_in: body.whatsappOptIn !== false,
    })
    .eq("id", studentId);

  if (profileError) throw profileError;

  const materialFlags = {
    ...DEFAULT_FLAGS,
    ...(body.materialFlags || {}),
  };

  const { error: preferenceError } = await client
    .from("student_access_preferences")
    .upsert(
      {
        student_id: studentId,
        payment_source: paymentSource,
        reminder_day_before: body.reminderDayBefore !== false,
        reminder_hour_before: body.reminderHourBefore !== false,
        sms_enabled: body.smsEnabled === true,
        material_flags: materialFlags,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" }
    );

  if (preferenceError) throw preferenceError;

  return {
    packages: packageIds.length,
    classes: classIds.length,
    tier,
    paymentSource,
  };
}

async function importStudents(client: any, records: AnyRow[]) {
  let created = 0;
  let skipped = 0;

  for (const row of records.slice(0, 500)) {
    const email = String(row.email || "").trim().toLowerCase();
    const fullName = String(row.fullName || "").trim();
    const phone = normalizeIndianWhatsAppPhone(row.phone);

    if (!email || !fullName || !phone) {
      skipped += 1;
      continue;
    }

    const { data: existing } = await client
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing?.id) {
      skipped += 1;
      continue;
    }

    const password = randomPassword();
    const { data: authData, error: authError } =
      await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (authError || !authData.user) {
      skipped += 1;
      continue;
    }

    const { error: profileError } = await client
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          phone,
          role: "student",
          tier: "free",
          whatsapp_opt_in: true,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      skipped += 1;
      continue;
    }

    created += 1;
  }

  return { created, skipped };
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireLiveAdmin();
    const client = liveService();
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "save_assignment") {
      const result = await saveAssignment(
        client,
        admin.email || "admin",
        body
      );
      return NextResponse.json({ ok: true, result });
    }

    if (action === "clear_access") {
      const studentId = String(body.studentId || "");
      if (!studentId) {
        throw Object.assign(new Error("studentId required"), {
          status: 400,
        });
      }

      const [{ error: e1 }, { error: e2 }, { error: e3 }] =
        await Promise.all([
          client.from("enrollments").delete().eq("user_id", studentId),
          client
            .from("live_class_assignments")
            .update({ status: "revoked" })
            .eq("student_id", studentId)
            .eq("status", "active"),
          client
            .from("profiles")
            .update({ tier: "free" })
            .eq("id", studentId),
        ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      return NextResponse.json({ ok: true });
    }

    if (action === "import_students") {
      const records = Array.isArray(body.records) ? body.records : [];
      const result = await importStudents(client, records);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "send_confirmation") {
      const studentId = String(body.studentId || "");
      const { data: student, error: studentError } = await client
        .from("profiles")
        .select("id,full_name,phone")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      const { data: assignment } = await client
        .from("live_class_assignments")
        .select("live_class_id")
        .eq("student_id", studentId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const { data: liveClass } = assignment?.live_class_id
        ? await client
            .from("live_classes")
            .select("id,title,topic,starts_at")
            .eq("id", assignment.live_class_id)
            .maybeSingle()
        : { data: null };

      const origin = safeOrigin(
        request.headers.get("origin") || ""
      );

      const result = await sendWhatsAppTemplate({
        to: normalizeIndianWhatsAppPhone(student.phone),
        templateName:
          process.env.WHATSAPP_TEMPLATE_PURCHASE ||
          "ibemhal_purchase_confirmation",
        studentName: student.full_name || "Student",
        classTitle: liveClass
          ? `${liveClass.title} - ${liveClass.topic || ""}`.trim()
          : "Ibemhal IAS course access",
        scheduleText: liveClass?.starts_at
          ? new Date(liveClass.starts_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : "Access confirmed",
        joinUrl: `${origin}/student-space`,
      });

      return NextResponse.json(
        { ok: result.ok, result },
        { status: result.ok ? 200 : 503 }
      );
    }

    throw Object.assign(new Error("Unknown action."), {
      status: 400,
    });
  } catch (error) {
    return adminError(error);
  }
}

