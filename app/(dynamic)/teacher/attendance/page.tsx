import { loadTeacherDashboard, teacherService } from "@/lib/teacher/server";

export const dynamic = "force-dynamic";

export default async function TeacherAttendancePage() {
  const data = await loadTeacherDashboard();
  const studentIds = Array.from(
    new Set(data.attendance.map((row: any) => String(row.student_id)))
  );

  let students: any[] = [];
  if (studentIds.length) {
    const result = await teacherService()
      .from("profiles")
      .select("id,full_name,student_code,email")
      .in("id", studentIds);
    students = result.data || [];
  }

  const studentMap = new Map(
    students.map((row: any) => [String(row.id), row])
  );
  const classMap = new Map(
    data.classes.map((row: any) => [String(row.id), row])
  );

  return (
    <div>
      <h1 className="text-2xl font-black">Attendance</h1>
      <p className="mt-2 text-sm text-slate-500">
        Attendance from your assigned classes only.
      </p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-[#102968] text-white">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Watch Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.attendance.map((row: any) => {
                const student: any = studentMap.get(String(row.student_id));
                const liveClass: any = classMap.get(String(row.live_class_id));

                return (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-black">
                        {student?.full_name || "Student"}
                      </div>
                      <div className="text-slate-400">
                        {student?.student_code || student?.email || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {liveClass?.title || "Live class"}
                    </td>
                    <td className="px-4 py-3">
                      {Math.round(Number(row.watch_seconds || 0) / 60)} min
                    </td>
                    <td className="px-4 py-3 font-bold capitalize">
                      {row.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!data.attendance.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No attendance records yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
