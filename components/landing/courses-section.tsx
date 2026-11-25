import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowRight } from "lucide-react";
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
  thumbnail_url?: string | null;
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
];

export async function CoursesSection() {
  noStore();
  const { data, error } = await createCmsServiceClient()
    .from("courses")
    .select(
      "id,title,description,exam_family,exam_name,exam_stage,price_inr,discounted_price_inr,thumbnail_url"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const courses = (data || []) as Course[];

  return (
    <section id="courses" className="border-t border-[#e8e1d5] bg-[#faf8f4] py-12 sm:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[#14256f] sm:text-3xl">
              Programmes open for enrolment
            </h2>
            <span className="hidden h-[2px] w-14 bg-[#c37a26] sm:inline-block" />
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#14256f] hover:underline"
          >
            View all programmes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Courses are temporarily unavailable.
          </p>
        ) : null}

        {!error && courses.length === 0 ? (
          <p className="mt-6 rounded-xl border border-[#e5dfd4] bg-white p-5 text-sm text-slate-600">
            New programmes will appear here as soon as the admin publishes them.
          </p>
        ) : null}

        <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, idx) => {
            const img =
              course.thumbnail_url || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
            const finalPrice = Number(
              course.discounted_price_inr ?? course.price_inr ?? 0
            );
            const badges = [
              course.exam_family,
              course.exam_stage,
              course.exam_name,
            ].filter(Boolean);

            return (
              <article
                key={course.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#e5dfd4] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                  <img
                    src={img}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-serif text-xl font-bold leading-snug text-[#14256f]">
                    {course.title}
                  </h3>

                  {badges.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {badges.map((b, bi) => (
                        <span
                          key={`${b}-${bi}`}
                          className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold ${
                            bi === 0
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600">
                    {course.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-black text-[#14256f]">
                    <span>₹{finalPrice.toLocaleString("en-IN")}</span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Guest checkout available
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-[#14256f] transition hover:bg-slate-50"
                    >
                      View details
                    </Link>
                    <Link
                      href={`/courses?add=${encodeURIComponent(course.id)}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#14256f] px-3 text-xs font-black text-white transition hover:bg-[#1d348f]"
                    >
                      Enrol <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
