"use client";

import * as React from "react";
import {
  Award,
  Calendar,
  ChevronRight,
  Expand,
  Search,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import {
  EXAM_CATEGORIES,
  GALLERY_YEARS,
  SEED_ACHIEVERS,
  type AchieverItem,
  type ExamCategory,
} from "@/lib/gallery/achievers-data";

export function AchieversGalleryClient() {
  const [items, setItems] = React.useState<AchieverItem[]>(SEED_ACHIEVERS);
  const [selectedYear, setSelectedYear] = React.useState<number | "ALL">("ALL");
  const [selectedExam, setSelectedExam] = React.useState<"All Exams" | ExamCategory>(
    "All Exams"
  );
  const [query, setQuery] = React.useState("");
  const [activeItem, setActiveItem] = React.useState<AchieverItem | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/achievers", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items) && data.items.length) {
          setItems(data.items);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedYear !== "ALL" && item.year !== selectedYear) return false;
      if (selectedExam !== "All Exams" && item.examCategory !== selectedExam) {
        return false;
      }
      if (!q) return true;
      const hay = [
        item.title,
        item.subtitle,
        item.rankBadge || "",
        item.examCategory,
        String(item.year),
        item.story,
        ...item.highlights,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, selectedYear, selectedExam, query]);

  const yearsToRender = React.useMemo(() => {
    if (selectedYear !== "ALL") return [selectedYear];
    const allYears = new Set<number>([...GALLERY_YEARS, ...items.map((i) => i.year)]);
    return Array.from(allYears).sort((a, b) => b - a);
  }, [selectedYear, items]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-[76px] pb-20">
      {/* Hero Spotlight */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0e1b54] via-[#14256f] to-[#1e3a8a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(243,209,139,0.16),transparent_42%)]" />
        <div className="relative mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-[#f3d18b] backdrop-blur">
            <Trophy className="h-3.5 w-3.5" />
            Hall of Fame · Successful Candidates &amp; Alumni
          </div>
          <h1 className="mt-4 max-w-3xl font-serif text-3xl font-bold tracking-tight sm:text-5xl">
            Celebrating Our Achievers Across Every Year
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
            Explore our students who cleared UPSC Civil Services, SSC CGL/GD,
            Banking, and Manipur Civil Services (MCSCC) with flying colors.
            Browse step-by-step from the latest selections or jump straight to
            any year from 2020 to 2026.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold">
              <Award className="h-3.5 w-3.5 text-[#f3d18b]" />
              500+ Selections
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold">
              <Calendar className="h-3.5 w-3.5 text-[#f3d18b]" />
              2020 – 2026 Archive
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 text-[#f3d18b]" />
              All India &amp; State Ranks
            </span>
          </div>
        </div>
      </section>

      {/* Year & Exam Filter Bar */}
      <div className="mx-auto -mt-6 max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-blue-950/5 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear("ALL")}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                selectedYear === "ALL"
                  ? "bg-[#14256f] text-white shadow-sm"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              All Years
            </button>
            {GALLERY_YEARS.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  selectedYear === yr
                    ? "bg-[#14256f] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {yr === 2026 ? "2026 (Latest)" : yr}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {EXAM_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedExam(cat)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                    selectedExam === cat
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search student, rank, or exam..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-[#14256f] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Year Timeline */}
      <div className="mx-auto mt-10 max-w-[1400px] space-y-12 px-4 sm:px-6 lg:px-8">
        {yearsToRender.map((yr) => {
          const yearItems = filtered.filter((item) => item.year === yr);
          if (selectedYear === "ALL" && query.trim() && !yearItems.length) {
            return null;
          }

          return (
            <section key={yr} id={`year-${yr}`} className="relative">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 items-center rounded-xl bg-[#14256f] px-4 text-base font-black text-white shadow-sm">
                    {yr}
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                      {yr === 2026
                        ? "2025–2026 Latest Selections"
                        : `Class of ${yr} Achievers`}
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      {yearItems.length}{" "}
                      {yearItems.length === 1 ? "gallery highlight" : "gallery highlights"}
                    </p>
                  </div>
                </div>
                {selectedYear === "ALL" && yearItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#14256f] hover:underline"
                  >
                    Focus on {yr} <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {yearItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                  <p className="text-sm font-bold text-slate-700">
                    No {selectedExam !== "All Exams" ? `${selectedExam} ` : ""}
                    achiever photos added for {yr} yet.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Admins can upload {yr} alumni photos and rank posters anytime from the Admin Hall of Fame Manager.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {yearItems.map((item) => (
                    <article
                      key={item.id}
                      onClick={() => setActiveItem(item)}
                      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#14256f]/40 hover:shadow-xl"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#14256f]/90 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                          {item.year}
                        </div>
                        <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#14256f] opacity-0 shadow transition group-hover:opacity-100">
                          <Expand className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                            {item.examCategory}
                          </span>
                          {item.rankBadge && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#14256f]">
                              {item.rankBadge}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2.5 text-sm font-black leading-snug text-slate-950">
                          {item.title}
                        </h3>
                        {item.subtitle && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                            {item.subtitle}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-[#14256f]">
                          <span>View Poster &amp; Candidates</span>
                          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setActiveItem(null)}
        >
          <div
            className="relative grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.25fr_.85fr]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              aria-label="Close modal"
              className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex max-h-[60vh] items-center justify-center bg-slate-100 p-3 lg:max-h-[92vh]">
              <img
                src={activeItem.imageUrl}
                alt={activeItem.title}
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            </div>

            <div className="flex flex-col overflow-y-auto p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#14256f] px-3 py-1 text-xs font-black text-white">
                  {activeItem.year}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">
                  {activeItem.examCategory}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-950">
                {activeItem.title}
              </h3>
              {activeItem.subtitle && (
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {activeItem.subtitle}
                </p>
              )}
              {activeItem.story && (
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  {activeItem.story}
                </p>
              )}
              {activeItem.highlights.length > 0 && (
                <div className="mt-5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Selected Candidates &amp; Highlights
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {activeItem.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
