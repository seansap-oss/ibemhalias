"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  IndianRupee,
  Trophy,
  Users,
} from "lucide-react";
import { PortalFloatingControls } from "@/components/portal/portal-floating-controls";

type CmsHeroItem = {
  id: string;
  title?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  external_url?: string | null;
};

const DEFAULT_HERO_IMG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=85";

export function HeroSection() {
  const [heroImages, setHeroImages] = React.useState<
    Array<{ id: string; url: string; title: string }>
  >([]);
  const [activeSlide, setActiveSlide] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/cms/content?section=hero", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((payload) => {
        if (cancelled) return;
        const imgs = ((payload.items || []) as CmsHeroItem[])
          .filter(
            (item) =>
              item.media_type === "image" &&
              Boolean(item.media_url || item.external_url)
          )
          .map((item, idx) => ({
            id: item.id || `hero-${idx}`,
            url: String(item.media_url || item.external_url),
            title: item.title || "Ibemhal IAS",
          }));
        if (imgs.length) setHeroImages(imgs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const currentHero =
    heroImages.length > 0
      ? heroImages[activeSlide % heroImages.length]
      : { id: "default", url: DEFAULT_HERO_IMG, title: "Students preparing at Ibemhal IAS" };

  return (
    <section className="bg-[#faf8f4] pt-[104px] text-[#14256f]">
      {/* Hero Banner */}
      <div className="border-b border-[#e8e1d5]">
        <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.08fr] lg:px-8 lg:py-14">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#b4691e]">
              <span className="h-[2px] w-7 bg-[#c37a26]" />
              Prepare with purpose
            </div>

            <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.06] tracking-tight text-[#14256f] sm:text-5xl lg:text-[3.5rem]">
              Find your path to the next{" "}
              <span className="relative inline-block">
                exam.
                <span className="absolute -bottom-1 left-0 right-0 h-[4px] rounded-full bg-[#c37a26]" />
              </span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-slate-700 sm:text-lg">
              Structured courses, regular practice, and trusted guidance for
              UPSC, Banking, SSC and State exams.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-[#14256f] px-6 text-sm font-black text-white shadow-md shadow-blue-950/15 transition hover:bg-[#1d348f]"
              >
                Explore courses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/resources"
                className="inline-flex min-h-12 items-center rounded-xl border border-[#14256f]/30 bg-white px-6 text-sm font-bold text-[#14256f] transition hover:border-[#14256f] hover:bg-slate-50"
              >
                Free resources
              </Link>
              <Link
                href="/achievers"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/90 px-5 text-sm font-black text-amber-900 transition hover:bg-amber-100"
              >
                <Trophy className="h-4 w-4 text-[#c37a26]" />
                Hall of Fame
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#e5dfd4] bg-white shadow-xl shadow-blue-950/10">
              <img
                src={currentHero.url}
                alt={currentHero.title}
                className="h-full w-full object-cover object-center"
              />
              {heroImages.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous hero photo"
                    onClick={() =>
                      setActiveSlide(
                        (s) => (s - 1 + heroImages.length) % heroImages.length
                      )
                    }
                    className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#14256f] shadow hover:bg-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next hero photo"
                    onClick={() =>
                      setActiveSlide((s) => (s + 1) % heroImages.length)
                    }
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#14256f] shadow hover:bg-white"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="mt-3 grid gap-2.5 sm:absolute sm:-bottom-5 sm:left-4 sm:right-4 sm:mt-0 sm:grid-cols-2">
              <Link
                href="/achievers"
                className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white/95 p-3 shadow-lg backdrop-blur transition hover:border-amber-400"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-[#b4691e]">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-[#14256f]">
                    Hall of Fame · 500+ Selections
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    Explore 2020–2026 Alumni &amp; Toppers →
                  </div>
                </div>
              </Link>

              <Link
                href="/courses"
                className="flex items-center gap-3 rounded-2xl border border-[#e5dfd4] bg-white/95 p-3 shadow-lg backdrop-blur transition hover:border-[#14256f]/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#14256f]">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-[#14256f]">
                    New batches
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    UPSC · Banking · State exams
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Explore by Exam */}
      <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[#14256f] sm:text-3xl">
              Explore by exam
            </h2>
            <span className="hidden h-[2px] w-14 bg-[#c37a26] sm:inline-block" />
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#14256f] hover:underline"
          >
            View all courses <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Building2,
              title: "UPSC & Civil Services",
              body: "Comprehensive preparation for CSE (Prelims, Mains and Interview).",
              href: "/courses?family=UPSC",
            },
            {
              icon: IndianRupee,
              title: "Banking Exams",
              body: "Focused preparation for Bank, RRB and related exams.",
              href: "/courses?family=Banking",
            },
            {
              icon: Users,
              title: "SSC & State Exams",
              body: "Preparation for SSC and various State-level competitive exams.",
              href: "/courses?family=SSC",
            },
          ].map(({ icon: Icon, title, body, href }) => (
            <Link
              key={title}
              href={href}
              className="group flex items-start gap-4 rounded-2xl border border-[#e5dfd4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#14256f]/40 hover:shadow-md"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#14256f] transition group-hover:bg-[#14256f] group-hover:text-white">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#14256f]">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {body}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <PortalFloatingControls />
    </section>
  );
}
