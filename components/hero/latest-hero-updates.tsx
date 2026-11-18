"use client";

import * as React from "react";
import Link from "next/link";

type Course = { id: string; title: string; exam_name: string; price_inr: number };
type Resource = { id: string; title: string; section_path: string };

export function LatestHeroUpdates() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [resources, setResources] = React.useState<Resource[]>([]);
  React.useEffect(() => {
    let active = true;
    fetch("/api/landing/latest", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to load updates");
      return response.json();
    }).then((data) => {
      if (active) { setCourses(data.courses || []); setResources(data.resources || []); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!courses.length && !resources.length) return null;
  return <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><h2 className="text-sm font-black text-[#14256f]">Latest courses and resources</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{courses.map((course) => <Link key={course.id} href={`/courses/${course.id}`} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm hover:bg-blue-50"><span className="block text-[10px] font-black uppercase text-indigo-700">New course · {course.exam_name}</span><b className="mt-1 block text-slate-900">{course.title}</b><span className="mt-1 block text-xs text-slate-600">₹{Number(course.price_inr).toLocaleString("en-IN")} · View and buy</span></Link>)}{resources.map((resource) => <Link key={resource.id} href={resource.section_path} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm hover:bg-emerald-50"><span className="block text-[10px] font-black uppercase text-emerald-700">New resource</span><b className="mt-1 block text-slate-900">{resource.title}</b><span className="mt-1 block text-xs text-slate-600">Open resources</span></Link>)}</div></div>;
}
