import { cookies } from "next/headers";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { createSessionClient } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import {
  DEFAULT_TEACHER_PERMISSIONS,
  type TeacherPermissionKey,
} from "@/lib/teacher/crm";

export type TeacherIdentity = {
  id: string;
  email: string;
  fullName: string;
  role: "instructor" | "admin";
};

export function teacherService() {
  return createCmsServiceClient();
}

export async function requireTeacher(): Promise<TeacherIdentity> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(getAdminCookieName())?.value;
  const dedicatedAdmin = await verifyAdminSessionToken(adminToken);

  if (dedicatedAdmin) {
    return {
      id: `admin:${dedicatedAdmin.email}`,
      email: dedicatedAdmin.email,
      fullName: "Administrator",
      role: "admin",
    };
  }

  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    throw Object.assign(new Error("UNAUTHENTICATED"), { status: 401 });
  }

  const service = teacherService();
  const { data: profile, error } = await service
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    throw Object.assign(new Error("STAFF_PROFILE_NOT_FOUND"), { status: 403 });
  }

  const role = String(profile.role || "").toLowerCase();
  if (role !== "instructor" && role !== "admin") {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }

  return {
    id: user.id,
    email: String(profile.email || user.email || ""),
    fullName: String(profile.full_name || user.email || "Teacher"),
    role: role as "instructor" | "admin",
  };
}

function norm(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export async function getTeacherPermissions(staff: TeacherIdentity) {
  if (staff.role === "admin") {
    return { ...DEFAULT_TEACHER_PERMISSIONS };
  }

  const service = teacherService();
  const { data, error } = await service
    .from("teacher_permissions")
    .select("*")
    .eq("teacher_id", staff.id)
    .maybeSingle();

  if (error) {
    return { ...DEFAULT_TEACHER_PERMISSIONS };
  }

  return {
    ...DEFAULT_TEACHER_PERMISSIONS,
    ...(data || {}),
  };
}

export async function requireTeacherPermission(
  permission: TeacherPermissionKey,
  staffInput?: TeacherIdentity
) {
  const staff = staffInput || (await requireTeacher());
  if (staff.role === "admin") return staff;

  const permissions = await getTeacherPermissions(staff);
  if (!permissions[permission]) {
    throw Object.assign(new Error("TEACHER_PERMISSION_DENIED"), { status: 403 });
  }

  return staff;
}

export async function getTeacherCourseIds(staff: TeacherIdentity) {
  const service = teacherService();

  if (staff.role === "admin") {
    const { data } = await service.from("courses").select("id");
    return (data || []).map((row: any) => String(row.id));
  }

  const { data } = await service
    .from("courses")
    .select("id")
    .eq("instructor_id", staff.id);

  return (data || []).map((row: any) => String(row.id));
}

export async function getTeacherClassIds(staff: TeacherIdentity) {
  const service = teacherService();

  if (staff.role === "admin") {
    const { data } = await service.from("live_classes").select("id");
    return (data || []).map((row: any) => String(row.id));
  }

  const allowed = new Set<string>();
  const courseIds = await getTeacherCourseIds(staff);

  if (courseIds.length) {
    const { data: mappings } = await service
      .from("live_class_course_access")
      .select("live_class_id,course_id")
      .in("course_id", courseIds);

    for (const row of mappings || []) {
      allowed.add(String(row.live_class_id));
    }
  }

  const { data: classes } = await service
    .from("live_classes")
    .select("id,faculty_name");

  for (const row of classes || []) {
    if (
      norm(row.faculty_name) &&
      norm(row.faculty_name) === norm(staff.fullName)
    ) {
      allowed.add(String(row.id));
    }
  }

  return Array.from(allowed);
}

export async function requireTeacherForClass(classId: string) {
  const staff = await requireTeacher();
  await requireTeacherPermission("can_teacher_studio", staff);

  if (staff.role === "admin") return staff;

  const classIds = await getTeacherClassIds(staff);
  if (!classIds.includes(classId)) {
    throw Object.assign(new Error("CLASS_NOT_ASSIGNED_TO_TEACHER"), {
      status: 403,
    });
  }

  return staff;
}

export async function loadTeacherDashboard() {
  const staff = await requireTeacher();
  const service = teacherService();
  const [courseIds, classIds, permissions] = await Promise.all([
    getTeacherCourseIds(staff),
    getTeacherClassIds(staff),
    getTeacherPermissions(staff),
  ]);

  let courses: any[] = [];
  let classes: any[] = [];
  let resources: any[] = [];
  let attendance: any[] = [];

  if (courseIds.length) {
    const result = await service
      .from("courses")
      .select("id,title,slug,is_published,short_tagline")
      .in("id", courseIds)
      .order("title");
    courses = result.data || [];
  }

  if (classIds.length) {
    const classResult = await service
      .from("live_classes")
      .select(
        "id,title,topic,faculty_name,starts_at,ends_at,status,capacity,provider,join_url,recording_url"
      )
      .in("id", classIds)
      .order("starts_at", { ascending: true });
    classes = classResult.data || [];

    if (permissions.can_study_materials) {
      const resResult = await service
        .from("live_class_resources")
        .select("id,live_class_id,title,resource_type,external_url")
        .in("live_class_id", classIds)
        .order("created_at", { ascending: false });
      resources = resResult.data || [];
    }

    if (permissions.can_attendance) {
      const attResult = await service
        .from("live_class_attendance")
        .select("id,live_class_id,student_id,watch_seconds,status")
        .in("live_class_id", classIds);
      attendance = attResult.data || [];
    }
  }

  return {
    staff,
    courses,
    classes,
    resources,
    attendance,
    permissions,
  };
}
