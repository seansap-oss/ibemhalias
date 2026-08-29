import {
  getTeacherCourseIds,
  requireTeacher,
  teacherService,
} from "@/lib/teacher/server";
import { TeacherScheduleForm } from "@/components/teacher/teacher-schedule-form";

export const dynamic = "force-dynamic";

export default async function TeacherSchedulePage() {
  const staff = await requireTeacher();
  const service = teacherService();
  const courseIds = await getTeacherCourseIds(staff);

  const { data: courses } = courseIds.length
    ? await service
        .from("courses")
        .select("id,title")
        .in("id", courseIds)
        .order("title")
    : { data: [] as any[] };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black">Schedule Class</h1>
      <p className="mt-2 text-sm text-slate-500">
        Schedule Live Now for one of your assigned courses.
      </p>

      <div className="mt-6">
        <TeacherScheduleForm courses={(courses || []) as any[]} />
      </div>
    </div>
  );
}
