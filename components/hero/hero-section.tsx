"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Building2, ExternalLink, FileText, GraduationCap, Laptop, Play, Target } from "lucide-react";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { WhatsNew } from "@/components/portal/whats-new";
import { PortalFloatingControls } from "@/components/portal/portal-floating-controls";
import { HeroCmsDeck } from "@/components/cms/hero-cms-deck";
import { useSiteTheme } from "@/components/theme/site-theme-provider";
import { PremiumHome } from "@/components/premium/premium-home";
import { LatestHeroUpdates } from "./latest-hero-updates";

const stories = [
  {
    label: "Academy",
    title: "Your Journey Begins Here.",
    subtitle: "Quality guidance. Affordable fees. Real results.",
    image:
      "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1400&q=90",
    href: "/about",
  },
  {
    label: "Selected Candidates",
    title: "Results That Inspire.",
    subtitle: "Meet selected candidates and learn from their journey.",
    image:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=90",
    href: "/student-space",
  },
  {
    label: "Free Resources",
    title: "Study Smarter.",
    subtitle: "NCERT books, PYQs, solutions and exam resources.",
    image:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=90",
    href: "/resources",
  },
  {
    label: "Current Affairs",
    title: "Stay Updated Every Day.",
    subtitle: "Daily and monthly current affairs for Civil Service and SSC/Banking.",
    image:
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=90",
    href: "/current-affairs/daily",
  },
  {
    label: "Mentorship",
    title: "Book Personal Guidance.",
    subtitle: "Choose counselling, mentorship and available time slots.",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1400&q=90",
    href: "/mentorship",
  },
];

function FallbackHero() {
  const [active, setActive] = React.useState(0);
  const [direction, setDirection] = React.useState(1);

  const next = () => {
    setDirection(1);
    setActive((value) => (value + 1) % stories.length);
  };

  const previous = () => {
    setDirection(-1);
    setActive((value) => (value - 1 + stories.length) % stories.length);
  };

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -70 || info.velocity.x < -450) next();
    if (info.offset.x > 70 || info.velocity.x > 450) previous();
  };

  const current = stories[active];

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] bg-[#14256f] shadow-2xl shadow-blue-950/15 sm:aspect-[16/10] lg:aspect-[16/9]">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current.title}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 70 : -70, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: direction > 0 ? -70 : 70, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={onDragEnd}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          <img src={current.image} alt={current.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1d62]/95 via-[#112d79]/75 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
            <div className="max-w-xl">
              <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-black text-blue-100 backdrop-blur">
                {current.label}
              </span>

              <h1 className="mt-4 text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                {current.title}
              </h1>

              <p className="mt-4 max-w-lg text-sm font-medium leading-relaxed text-blue-100 sm:text-base">
                {current.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={current.href}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#14256f]"
                >
                  Explore <ExternalLink className="h-4 w-4" />
                </Link>

                <button className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-black text-white backdrop-blur">
                  <Play className="h-4 w-4" />
                  Watch Video
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={previous}
        aria-label="Previous story"
        className="absolute left-4 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-[#14256f] shadow-lg"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <button
        onClick={next}
        aria-label="Next story"
        className="absolute right-4 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-[#14256f] shadow-lg"
      >
        <ArrowRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-full bg-black/15 px-3 py-2 backdrop-blur">
        {stories.map((_, index) => (
          <button
            key={index}
            onClick={() => setActive(index)}
            aria-label={`Show story ${index + 1}`}
            className={[
              "h-2 rounded-full transition-all",
              active === index ? "w-7 bg-white" : "w-2 bg-white/55",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

export function HeroSection() {
  const { theme } = useSiteTheme();
  if (theme === "premium") return <PremiumHome />;

  return (
    <section className="bg-[#faf8f4] pt-[76px] text-[#19235f]">
      <div className="mx-auto grid max-w-[1500px] overflow-hidden lg:min-h-[520px] lg:grid-cols-[47%_53%]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-12 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd6d1d]">Civil services, made accessible</p>
          <h1 className="mt-7 max-w-[660px] font-serif text-[clamp(3.4rem,5.2vw,6rem)] leading-[.98] tracking-[-.045em]">Prepare with purpose.<br />Go further.</h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-slate-700">Focused courses, live teaching and practical resources for your next exam.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/courses" className="inline-flex min-h-12 items-center gap-3 rounded-md bg-[#19235f] px-6 font-semibold text-white transition hover:bg-[#303d83]">Explore courses <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/resources" className="inline-flex min-h-12 items-center rounded-md border border-[#19235f] px-6 font-semibold transition hover:bg-white">See free resources</Link>
          </div>
        </div>
        <div className="relative min-h-[340px] overflow-hidden lg:min-h-[520px]">
          <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=85" alt="Students studying together" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute bottom-6 right-6 border-l-[3px] border-amber-600 bg-white px-4 py-3 text-sm font-semibold shadow-lg">Built for serious preparation</div>
        </div>
      </div>

      <div className="border-y border-[#e5e0d7] bg-white">
        <div className="mx-auto grid max-w-[1500px] divide-y divide-[#e5e0d7] px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-12">
          {[
            { icon: GraduationCap, title: "Expert-led lessons", detail: "Learn from experienced faculty who understand the exam." },
            { icon: Target, title: "Practice that builds confidence", detail: "Topic-wise tests, past papers and applied learning." },
            { icon: Laptop, title: "Study from anywhere", detail: "Access your courses and resources on any device." },
          ].map(({ icon: Icon, title, detail }) => <div key={title} className="flex items-center gap-4 py-5 sm:px-5 first:pl-0"><Icon className="h-8 w-8 shrink-0 stroke-[1.5]" /><div><p className="font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p></div></div>)}
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-6 py-14 lg:px-12">
        <div className="flex items-end justify-between gap-4"><h2 className="font-serif text-4xl tracking-tight sm:text-5xl">Find your path</h2><Link href="/courses" className="hidden items-center gap-2 text-sm font-semibold text-[#a85e16] sm:inline-flex">View all courses <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            { icon: Building2, title: "UPSC & Civil Services", detail: "UPSC CSE  ·  IAS  ·  IPS  ·  IFS", body: "Explore courses for civil services preparation.", href: "/courses" },
            { icon: BookOpen, title: "Banking Exams", detail: "IBPS  ·  SBI  ·  RRB  ·  NABARD", body: "Focused preparation for major banking exams.", href: "/courses" },
            { icon: FileText, title: "SSC & State Exams", detail: "SSC CGL  ·  CHSL  ·  STATE PSC", body: "Build a steady path for SSC and state exams.", href: "/courses" },
          ].map(({ icon: Icon, title, detail, body, href }) => <Link key={title} href={href} className="group flex min-h-48 items-center gap-5 rounded-md border border-[#d8d3ca] bg-[#fdfbf8] p-6 transition hover:border-[#19235f] hover:bg-white"><Icon className="h-16 w-16 shrink-0 stroke-[1.1] text-[#19235f]" /><div><h3 className="border-l-[3px] border-[#c37a26] pl-3 font-serif text-xl font-bold">{title}</h3><p className="mt-3 text-[11px] font-bold uppercase tracking-wide">{detail}</p><p className="mt-3 text-sm leading-5 text-slate-600">{body}</p></div><ArrowRight className="ml-auto h-5 w-5 shrink-0 self-end transition group-hover:translate-x-1" /></Link>)}
        </div>
        <div className="mt-12"><h2 className="font-serif text-4xl tracking-tight">New from Ibemhal</h2><LatestHeroUpdates /></div>
      </div>

      <div className="border-t border-[#e5e0d7] bg-white py-14">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 font-serif text-3xl">Explore the full learning portal</h2>
          <div className="flex items-start gap-4"><PortalSidebar /><WhatsNew /><div className="min-w-0 flex-1"><HeroCmsDeck fallback={<FallbackHero />} /></div></div>
        </div>
      </div>

      <PortalFloatingControls />
    </section>
  );
}
