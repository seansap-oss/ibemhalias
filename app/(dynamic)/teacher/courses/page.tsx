import { BookOpen } from "lucide-react";
import { loadTeacherDashboard } from "@/lib/teacher/server";

export const dynamic = "force-dynamic";

export default async function TeacherCoursesPage() {
  const data = await loadTeacherDashboard();

  return (
    <div>
      <h1 className="text-2xl font-black">My Courses</h1>
      <p className="mt-2 text-sm text-slate-500">
        Courses assigned to your teacher account.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.courses.map((course: any) => (
          <div
            key={course.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-black">{course.title}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {course.short_tagline || "Ibemhal IAS course"}
            </p>
          </div>
        ))}

        {!data.courses.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
            No courses assigned. Ask an administrator to assign a course.
          </div>
        ) : null}
      </div>
    </div>
  );
}
