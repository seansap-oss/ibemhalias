import { NextResponse } from "next/server";
import { requireCmsAdmin } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";

const DEFAULT_EMAIL = "admin@ibemhal.ias";
const DEFAULT_PASSWORD = "admin@123";

export async function POST() {
  try {
    await requireCmsAdmin();
    const service = createCmsServiceClient();
    const email = process.env.TEST_STUDENT_EMAIL?.trim().toLowerCase() || DEFAULT_EMAIL;
    const password = process.env.TEST_STUDENT_PASSWORD || DEFAULT_PASSWORD;

    const { data: users, error: listError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    let user = users.users.find((entry) => entry.email?.toLowerCase() === email);

    if (!user) {
      const { data, error } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Ibemhal Test Student", testing_account: true },
      });
      if (error) throw error;
      user = data.user;
    } else {
      const { data, error } = await service.auth.admin.updateUserById(user.id, {
        password,
        user_metadata: { ...(user.user_metadata || {}), full_name: "Ibemhal Test Student", testing_account: true },
      });
      if (error) throw error;
      user = data.user;
    }

    if (!user) throw new Error("Unable to prepare the test student.");

    const { error: profileError } = await service.from("profiles").upsert({
      id: user.id,
      email,
      full_name: "Ibemhal Test Student",
      role: "student",
      tier: "all-access",
      whatsapp_opt_in: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (profileError) throw profileError;

    const { data: courses, error: courseError } = await service.from("courses").select("id").eq("is_published", true);
    if (courseError) throw courseError;
    if (courses?.length) {
      const { error } = await service.from("enrollments").upsert(courses.map((course) => ({
        user_id: user!.id,
        course_id: course.id,
        payment_status: "paid",
        enrolled_via: "admin_manual",
        amount_paid: 0,
        notes: "Temporary all-access testing account",
      })), { onConflict: "user_id,course_id" });
      if (error) throw error;
    }

    const { data: liveClasses, error: liveError } = await service.from("live_classes").select("id").in("status", ["scheduled", "live", "completed"]);
    if (liveError) throw liveError;
    if (liveClasses?.length) {
      const { error } = await service.from("live_class_assignments").upsert(liveClasses.map((liveClass) => ({
        live_class_id: liveClass.id,
        student_id: user!.id,
        source: "all_access",
        status: "active",
        assigned_by_email: "admin@ibemhal.ias",
      })), { onConflict: "live_class_id,student_id" });
      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      student: { id: user.id, email, fullName: "Ibemhal Test Student", tier: "all-access" },
      courses: courses?.length || 0,
      liveClasses: liveClasses?.length || 0,
      login: { email, password },
    });
  } catch (error: any) {
    const message = error?.message || "Unable to prepare test student.";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
