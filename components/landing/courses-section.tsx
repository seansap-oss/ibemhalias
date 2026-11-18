import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

type Course = {
  id: string;
  title: string;
  description: string;
  exam_family: string;
  exam_name: string;
  exam_stage: string;
  price_inr: number;
  discounted_price_inr: number | null;
};

export async function CoursesSection() {
  noStore();
  const { data, error } = await createCmsServiceClient()
    .from("courses")
    .select("id,title,description,exam_family,exam_name,exam_stage,price_inr,discounted_price_inr")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);
  const courses = (data || []) as Course[];

  return (
    <section id="courses" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#174699]">Ibemhal IAS courses</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#19235f] sm:text-4xl">Find your next course</h2>
            <p className="mt-2 text-slate-600">Explore courses without signing in. Choose a course and check out as a guest.</p>
          </div>
          <Link href="/courses" className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-[#174699]">Browse all courses →</Link>
        </div>
        {error ? <p role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Courses are temporarily unavailable.</p> : null}
        {!error && courses.length === 0 ? <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">New courses will appear here as soon as the admin publishes them.</p> : null}
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <article key={course.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#174699]">{course.exam_family} · {course.exam_name} · {course.exam_stage}</p>
              <h3 className="mt-3 text-xl font-black text-[#19235f]">{course.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{course.description}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <b className="text-[#19235f]">₹{Number(course.discounted_price_inr ?? course.price_inr).toLocaleString("en-IN")}</b>
                <div className="flex gap-2">
                  <Link href={`/courses/${course.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-[#202b70]">Details</Link>
                  <Link href={`/courses?add=${encodeURIComponent(course.id)}`} className="rounded-lg bg-[#202b70] px-3 py-2 text-sm font-bold text-white">Buy course</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
