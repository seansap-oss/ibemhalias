"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, Play } from "lucide-react";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { WhatsNew } from "@/components/portal/whats-new";
import { PortalFloatingControls } from "@/components/portal/portal-floating-controls";
import { HeroCmsDeck } from "@/components/cms/hero-cms-deck";

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
  return (
    <section className="bg-[radial-gradient(circle_at_top,_#eef3ff_0,_#ffffff_40%,_#ffffff_100%)] pt-24">
      <div className="mx-auto max-w-[1500px] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="flex items-start gap-4">
          <PortalSidebar />
          <WhatsNew />

          <div className="min-w-0 flex-1">
            <HeroCmsDeck fallback={<FallbackHero />} />

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["500+", "Selections"],
                ["10,000+", "Aspirants"],
                ["100+", "Courses"],
                ["4.9/5", "Student Rating"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <div className="text-xl font-black text-[#14256f]">{value}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PortalFloatingControls />
    </section>
  );
}
