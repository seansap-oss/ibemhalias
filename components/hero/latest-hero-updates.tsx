"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText } from "lucide-react";

type Course = { id: string; title: string; exam_name: string; price_inr: number };
type Resource = { id: string; title: string; section_path: string };

export function LatestHeroUpdates() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [resources, setResources] = React.useState<Resource[]>([]);

  React.useEffect(() => {
    let active = true;
    fetch("/api/landing/latest", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load updates");
        return response.json();
      })
      .then((data) => {
        if (active) {
          setCourses(data.courses || []);
          setResources(data.resources || []);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!courses.length && !resources.length) return null;

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {courses.slice(0, 2).map((course, index) => (
        <Link
          key={course.id}
          href={`/courses/${course.id}`}
          className="group flex min-h-44 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#14256f]/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]",
                index === 0
                  ? "bg-[#14256f] text-white"
                  : "bg-blue-600 text-white",
              ].join(" ")}
            >
              New Course · {course.exam_name}
            </span>
            <BookOpen className="h-4 w-4 text-slate-400 transition group-hover:text-[#14256f]" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold leading-snug text-slate-900">
            {course.title}
          </h3>
          <div className="mt-auto flex items-center justify-between pt-5">
            <span className="text-xl font-black text-slate-950">
              ₹{Number(course.price_inr).toLocaleString("en-IN")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#14256f]">
              View &amp; Buy{" "}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      ))}
      <Link
        href={resources[0]?.section_path || "/resources"}
        className="group flex min-h-44 flex-col rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">
            New Resource
          </span>
          <FileText className="h-4 w-4 text-emerald-600" />
        </div>
        <h3 className="mt-4 text-lg font-extrabold leading-snug text-slate-900">
          {resources[0]?.title || "Study Resources"}
        </h3>
        <p className="mt-1 text-xs font-medium text-slate-600">
          Curated notes, PYQs &amp; PDFs
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-emerald-700">
          Open resources{" "}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </Link>
    </div>
  );
}
