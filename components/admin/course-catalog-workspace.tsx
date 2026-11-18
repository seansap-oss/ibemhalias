"use client";

import * as React from "react";
import Link from "next/link";

type Course = { id: string; course_code: string; title: string; description: string; exam_family: string; exam_name: string; exam_stage: string; language: string; price_inr: number; discounted_price_inr: number | null; duration_months: number | null; is_published: boolean; created_at: string };

export function CourseCatalogWorkspace() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [family, setFamily] = React.useState("all");
  const load = React.useCallback(async () => {
    try {
      const response = await fetch("/api/admin/course-builder", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load courses");
      setCourses(body.courses || []); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load courses"); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const visible = courses.filter((course) => (family === "all" || course.exam_family === family) && `${course.title} ${course.exam_name} ${course.course_code}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="min-h-screen bg-[#f5f7fb] p-5 text-slate-900 lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Admin / Courses · Version 5.8.0</p><h1 className="mt-2 text-3xl font-black">Build courses for every exam.</h1><p className="mt-1 text-slate-500">Real courses, exam paths, materials and prices in one catalogue.</p></div><Link href="/admin/courses/new" className="rounded-xl bg-[#465fe4] px-5 py-3 text-sm font-bold text-white">+ Create course</Link></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Total courses", courses.length], ["Published", courses.filter((c) => c.is_published).length], ["Drafts", courses.filter((c) => !c.is_published).length]].map(([label, count]) => <div className="rounded-2xl border bg-white p-5" key={label}><p className="text-sm text-slate-500">{label}</p><b className="mt-2 block text-2xl">{count}</b></div>)}</div>
    <section className="mt-5 rounded-2xl border bg-white p-5"><div className="mb-5 flex flex-wrap gap-3"><input aria-label="Search courses" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search course or exam" className="min-w-56 flex-1 rounded-xl border px-4 py-3 text-sm" /><select aria-label="Exam family" value={family} onChange={(event) => setFamily(event.target.value)} className="rounded-xl border bg-white px-4 py-3 text-sm"><option value="all">All exam families</option><option value="national">National exams</option><option value="banking">Banking</option><option value="state">State PSC</option><option value="other">Other</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Course", "Exam path", "Duration", "Price", "Status", ""].map((heading) => <th className="px-4 py-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{visible.map((course) => <tr className="border-t" key={course.id}><td className="px-4 py-4"><b>{course.title}</b><small className="block font-mono text-slate-400">{course.course_code}</small></td><td className="px-4 py-4 capitalize">{course.exam_family} / {course.exam_name} / {course.exam_stage}</td><td className="px-4 py-4">{course.duration_months || 12} months</td><td className="px-4 py-4 font-bold">₹{(course.discounted_price_inr ?? course.price_inr).toLocaleString("en-IN")}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${course.is_published ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{course.is_published ? "Published" : "Draft"}</span></td><td className="px-4 py-4"><Link href={`/admin/courses/${course.id}/edit`} className="font-bold text-indigo-700 underline">Edit course</Link></td></tr>)}</tbody></table>{!loading && !visible.length && <p className="p-8 text-center text-sm text-slate-500">{courses.length ? "No courses match this search." : "No saved courses yet. Create one, then publish it to show it on the public website."}</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading courses…</p>}</div>
    </section>
  </div></main>;
}
