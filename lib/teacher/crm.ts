import { randomBytes } from "node:crypto";

export const DEFAULT_TEACHER_PERMISSIONS = {
  can_live_classes: true,
  can_schedule_classes: true,
  can_teacher_studio: true,
  can_study_materials: true,
  can_upload_materials: true,
  can_attendance: true,
  can_mock_tests: false,
  can_view_student_contacts: false,
};

export type TeacherPermissionKey = keyof typeof DEFAULT_TEACHER_PERMISSIONS;

export function temporaryPassword() {
  return `Ib@${randomBytes(8).toString("base64url")}9`;
}

export function fallbackStaffCode(teacherId: string) {
  return `TC-${String(teacherId || "")
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase()}`;
}

export function safeTeacherStatus(value: unknown) {
  const status = String(value || "").trim().toLowerCase();
  return ["active", "inactive", "leave", "archived"].includes(status)
    ? status
    : "active";
}

export function pickTeacherProfile(input: any) {
  return {
    alternate_phone: String(input?.alternate_phone || "").trim() || null,
    address_line1: String(input?.address_line1 || "").trim() || null,
    address_line2: String(input?.address_line2 || "").trim() || null,
    city: String(input?.city || "").trim() || null,
    state_region: String(input?.state_region || "").trim() || null,
    postal_code: String(input?.postal_code || "").trim() || null,
    country: String(input?.country || "India").trim() || "India",
    emergency_contact_name:
      String(input?.emergency_contact_name || "").trim() || null,
    emergency_contact_relation:
      String(input?.emergency_contact_relation || "").trim() || null,
    emergency_contact_phone:
      String(input?.emergency_contact_phone || "").trim() || null,
    qualification: String(input?.qualification || "").trim() || null,
    specialization: String(input?.specialization || "").trim() || null,
    joining_date: input?.joining_date || null,
    employment_status: safeTeacherStatus(input?.employment_status),
    bio: String(input?.bio || "").trim() || null,
  };
}

export function pickTeacherPermissions(input: any) {
  return Object.fromEntries(
    Object.entries(DEFAULT_TEACHER_PERMISSIONS).map(([key, fallback]) => [
      key,
      typeof input?.[key] === "boolean" ? input[key] : fallback,
    ])
  ) as typeof DEFAULT_TEACHER_PERMISSIONS;
}

export function isMissingTeacherCrmTable(error: any) {
  const text = String(error?.message || error || "").toLowerCase();
  return (
    text.includes("teacher_profiles") ||
    text.includes("teacher_permissions") ||
    text.includes("teacher_notes") ||
    text.includes("teacher_activity_log") ||
    text.includes("does not exist") ||
    text.includes("schema cache")
  );
}
