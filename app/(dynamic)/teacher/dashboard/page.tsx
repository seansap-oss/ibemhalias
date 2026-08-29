import Link from "next/link";
import { BookOpen, Clock3, FileText, Radio, Users } from "lucide-react";
import { loadTeacherDashboard, teacherService } from "@/lib/teacher/server";
export const dynamic = "force-dynamic";

function Card({ children }: { children: React.ReactNode }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">{children}</div>; }

export default async function TeacherDashboardPage() {
  const data = await loadTeacherDashboard();
  const now = Date.now();
  const upcoming = data.classes.filter((item: any) => item.status !== "cancelled" && item.status !== "completed" && new Date(item.starts_at || 0).getTime() >= now - 7200000);
  const nextClass = upcoming[0] || null;
  const studentIds = Array.from(new Set(data.attendance.map((row: any) => String(row.student_id))));
  let students: any[] = [];
  if (studentIds.length) {
    const result = await teacherService().from("profiles").select("id,full_name,student_code,email").in("id", studentIds);
    students = result.data || [];
  }
  const studentMap = new Map(students.map((row: any) => [String(row.id), row]));
  const classMap = new Map(data.classes.map((row: any) => [String(row.id), row]));

  return <div className="space-y-7">
    <div><div className="text-xs font-black uppercase tracking-[.16em] text-indigo-600">Teacher Dashboard</div><h1 className="mt-1 text-3xl font-black">Welcome, {data.staff.fullName}</h1><p className="mt-2 text-sm text-slate-500">Your classes, materials and student engagement in one workspace.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["My Courses",data.courses.length,BookOpen],["Live Classes",data.classes.length,Radio],["Attendance",data.attendance.length,Users],["Materials",data.resources.length,FileText]].map(([label,value,Icon]: any) => <Card key={label}><Icon className="h-5 w-5 text-indigo-600" /><div className="mt-4 text-3xl font-black">{value}</div><div className="text-xs font-bold text-slate-400">{label}</div></Card>)}</div>
    {nextClass ? <div className="rounded-3xl bg-gradient-to-r from-[#111b35] to-[#172554] p-6 text-white shadow-xl"><div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-[10px] font-black uppercase text-red-200"><Radio className="h-3.5 w-3.5" />Next Live Class</div><h2 className="mt-4 text-2xl font-black">{nextClass.title}</h2><p className="mt-1 text-sm text-slate-300">{nextClass.topic} · {new Date(nextClass.starts_at).toLocaleString()}</p></div><Link href={`/teacher/live-classes/studio/${nextClass.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 text-sm font-black"><Radio className="h-4 w-4" />Start Live Now</Link></div></div> : null}

    <section id="classes"><h2 className="mb-3 text-xl font-black">My Classes</h2><div className="space-y-3">{data.classes.map((item: any) => <Card key={item.id}><div className="flex flex-col gap-3 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="font-black">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.topic} · {new Date(item.starts_at).toLocaleString()} · {item.status}</div></div><Link href={`/teacher/live-classes/studio/${item.id}`} className="rounded-xl bg-[#102968] px-4 py-2.5 text-center text-xs font-black text-white">Open Teacher Studio</Link></div></Card>)}{!data.classes.length ? <Card><p className="text-sm text-slate-500">No classes are assigned to this teacher yet.</p></Card> : null}</div></section>

    <section id="courses"><h2 className="mb-3 text-xl font-black">My Courses</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.courses.map((course: any) => <Card key={course.id}><BookOpen className="h-5 w-5 text-indigo-600" /><h3 className="mt-3 font-black">{course.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{course.short_tagline || "Ibemhal IAS course"}</p></Card>)}</div></section>

    <section id="materials"><h2 className="mb-3 text-xl font-black">Study Material</h2><div className="space-y-3">{data.resources.map((resource: any) => <Card key={resource.id}><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-blue-600" /><div className="min-w-0 flex-1"><div className="truncate font-black">{resource.title}</div><div className="text-xs text-slate-500">{resource.resource_type}</div></div>{resource.external_url ? <a href={resource.external_url} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-xs font-black">Open</a> : <span className="text-[10px] font-bold text-slate-400">Secured file</span>}</div></Card>)}{!data.resources.length ? <Card><p className="text-sm text-slate-500">No resources are attached yet.</p></Card> : null}</div></section>

    <section id="attendance"><h2 className="mb-3 text-xl font-black">Attendance</h2><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-[#102968] text-white"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Watch Time</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{data.attendance.map((row: any) => { const student: any = studentMap.get(String(row.student_id)); const liveClass: any = classMap.get(String(row.live_class_id)); return <tr key={row.id} className="border-b"><td className="px-4 py-3"><b>{student?.full_name || "Student"}</b><div className="text-slate-400">{student?.student_code || student?.email || ""}</div></td><td className="px-4 py-3">{liveClass?.title || "Live class"}</td><td className="px-4 py-3">{Math.round(Number(row.watch_seconds || 0)/60)} min</td><td className="px-4 py-3 font-bold capitalize">{row.status}</td></tr>; })}</tbody></table></div></div></section>
  </div>;
}
