import { getTeacherCourseIds, requireTeacher, requireTeacherPermission, teacherService } from "@/lib/teacher/server";

// A display name is not a stable account identifier. Zoom host rights require
// the signed-in teacher to own a course linked to this class.
export async function requireZoomHostForClass(classId: string) {
  const staff = await requireTeacher();
  await requireTeacherPermission("can_teacher_studio", staff);
  if (staff.role === "admin") return staff;

  const courseIds = await getTeacherCourseIds(staff);
  if (!courseIds.length) throw Object.assign(new Error("CLASS_NOT_ASSIGNED_TO_TEACHER"), { status: 403 });

  const { data, error } = await teacherService()
    .from("live_class_course_access")
    .select("live_class_id")
    .eq("live_class_id", classId)
    .in("course_id", courseIds)
    .limit(1);
  if (error) throw error;
  if (!data?.length) throw Object.assign(new Error("CLASS_NOT_ASSIGNED_TO_TEACHER"), { status: 403 });
  return staff;
}
