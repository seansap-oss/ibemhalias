"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  ExternalLink,
  Play,
  Sparkles,
  Trophy,
  Users,
  Star,
} from "lucide-react";

type Story = {
  id: number;
  label: string;
  type: "video" | "image" | "link";
  title: string;
  subtitle: string;
  image: string;
  href?: string;
  videoSrc?: string;
};

const stories: Story[] = [
  {
    id: 1,
    label: "Intro",
    type: "video",
    title: "Your Journey to Success Starts Here",
    subtitle: "A quick introduction to Ibemhal IAS Academy",
    image:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1000&q=85",
    videoSrc: "/hero/academy-intro.mp4",
  },
  {
    id: 2,
    label: "Toppers",
    type: "image",
    title: "Meet Our Selected Aspirants",
    subtitle: "Real results. Real stories. Real preparation.",
    image:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=85",
    href: "#toppers",
  },
  {
    id: 3,
    label: "Courses",
    type: "image",
    title: "Foundation to Advanced Preparation",
    subtitle: "Structured learning paths for every stage.",
    image:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=85",
    href: "#courses",
  },
  {
    id: 4,
    label: "Campus",
    type: "image",
    title: "Study in a Focused Environment",
    subtitle: "Explore classrooms, facilities and campus life.",
    image:
      "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=85",
    href: "#campus",
  },
  {
    id: 5,
    label: "AI Tutor",
    type: "link",
    title: "24/7 AI Study Support",
    subtitle: "Ask, revise, practise and plan from your phone.",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1000&q=85",
    href: "#ai-tutor",
  },
  {
    id: 6,
    label: "Pricing",
    type: "link",
    title: "Affordable Plans",
    subtitle: "Choose a plan that fits your preparation journey.",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=85",
    href: "#pricing",
  },
  {
    id: 7,
    label: "Success",
    type: "image",
    title: "Hall of Fame",
    subtitle: "Celebrate selections and milestones with us.",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=85",
    href: "#toppers",
  },
  {
    id: 8,
    label: "Mentors",
    type: "image",
    title: "Learn from Experienced Mentors",
    subtitle: "Focused guidance, strategy and feedback.",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=85",
    href: "#courses",
  },
  {
    id: 9,
    label: "Practice",
    type: "image",
    title: "Practice Smarter",
    subtitle: "Mocks, revision and performance tracking.",
    image:
      "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=85",
    href: "/dashboard",
  },
  {
    id: 10,
    label: "Community",
    type: "link",
    title: "Join 10,000+ Aspirants",
    subtitle: "Build consistency with a motivated learning community.",
    image:
      "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1000&q=85",
    href: "/dashboard",
  },
];

const stats = [
  { icon: Trophy, value: "500+", label: "Selections" },
  { icon: Users, value: "10,000+", label: "Aspirants" },
  { icon: BookOpen, value: "100+", label: "Courses" },
  { icon: Star, value: "4.9/5", label: "Rating" },
];

export function HeroSection() {
  const [active, setActive] = React.useState(0);
  const [direction, setDirection] = React.useState(1);

  const show = React.useCallback(
    (next: number) => {
      const normalized = (next + stories.length) % stories.length;
      setDirection(normalized > active ? 1 : -1);
      setActive(normalized);
    },
    [active]
  );

  const next = React.useCallback(() => {
    setDirection(1);
    setActive((current) => (current + 1) % stories.length);
  }, []);

  const previous = React.useCallback(() => {
    setDirection(-1);
    setActive((current) => (current - 1 + stories.length) % stories.length);
  }, []);

  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -70 || info.velocity.x < -450) next();
    if (info.offset.x > 70 || info.velocity.x > 450) previous();
  };

  const current = stories[active];

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_#eef2ff_0,_#ffffff_45%,_#ffffff_100%)] pt-24 md:pt-28">
      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
            Affordable <span className="text-indigo-600">IAS/MPSC</span> coaching.
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">
            Swipe stories. Watch toppers. Explore courses. Get AI support.
          </p>
        </div>

        <div className="mx-auto mt-5 flex max-w-3xl gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {stories.slice(0, 5).map((story, index) => (
            <button
              key={story.id}
              onClick={() => show(index)}
              className={[
                "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition sm:text-sm",
                index === active
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600",
              ].join(" ")}
            >
              {String(index + 1).padStart(2, "0")} {story.label}
            </button>
          ))}
          <button
            onClick={() => show(5)}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:text-sm"
          >
            +5 more
          </button>
        </div>

        <div className="relative mx-auto mt-3 w-full max-w-[430px] md:max-w-[470px]">
          <div className="pointer-events-none absolute inset-y-4 left-4 right-[-46px] hidden sm:block">
            {[4, 3, 2, 1].map((depth) => {
              const story = stories[(active + depth) % stories.length];
              return (
                <div
                  key={`${story.id}-${depth}`}
                  className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/80 bg-slate-200 shadow-xl"
                  style={{
                    transform: `translateX(${depth * 11}px) scale(${1 - depth * 0.018})`,
                    zIndex: 10 - depth,
                  }}
                >
                  <img
                    src={story.image}
                    alt=""
                    className="h-full w-full object-cover opacity-80"
                  />
                </div>
              );
            })}
          </div>

          <div className="relative z-20 aspect-[9/16] w-full">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={current.id}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 70 : -70, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction > 0 ? -70 : 70, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={onDragEnd}
                className="absolute inset-0 cursor-grab overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-indigo-950/15 active:cursor-grabbing"
              >
                {current.type === "video" ? (
                  <>
                    <video
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                      poster={current.image}
                    >
                      <source src={current.videoSrc} type="video/mp4" />
                    </video>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 to-transparent" />
                    <div className="pointer-events-none absolute left-5 top-5 right-5">
                      <span className="inline-flex rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                        Ibemhal IAS Academy
                      </span>
                      <h2 className="mt-3 max-w-[85%] text-3xl font-black leading-tight text-white">
                        {current.title}
                      </h2>
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={current.image}
                      alt={current.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/35" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <span className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                        {String(current.id).padStart(2, "0")} · {current.label}
                      </span>
                      <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                        {current.title}
                      </h2>
                      <p className="mt-2 max-w-sm text-sm text-white/80 sm:text-base">
                        {current.subtitle}
                      </p>
                      {current.href && (
                        <Link
                          href={current.href}
                          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950"
                        >
                          Open
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </>
                )}

                {current.type === "video" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-white/92 shadow-xl">
                      <Play className="ml-1 h-8 w-8 fill-indigo-600 text-indigo-600" />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={previous}
              aria-label="Previous story"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5">
                {stories.map((story, index) => (
                  <button
                    key={story.id}
                    onClick={() => show(index)}
                    aria-label={`Show story ${index + 1}`}
                    className={[
                      "h-2 rounded-full transition-all",
                      index === active ? "w-6 bg-indigo-600" : "w-2 bg-slate-300",
                    ].join(" ")}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Swipe left or right to explore
              </p>
            </div>

            <button
              onClick={next}
              aria-label="Next story"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="#toppers"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            <Trophy className="h-4 w-4 text-indigo-600" /> Toppers Talk
          </Link>
          <Link
            href="#ai-tutor"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" /> AI Tutor
          </Link>
          <Link
            href="#campus"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            <Building2 className="h-4 w-4 text-indigo-600" /> Campus Tour
          </Link>
          <Link
            href="#courses"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            <BookOpen className="h-4 w-4 text-indigo-600" /> Courses
          </Link>
        </div>

        <div className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
          <Link
            href="#courses"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200"
          >
            Explore Courses <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => show(0)}
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-800"
          >
            <Play className="h-4 w-4 text-indigo-600" /> Watch Intro
          </button>
        </div>

        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
          Learn in Manipuri, prepare with English study material, and practise for competitive exams from one mobile-first platform.
        </p>

        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={[
                "px-2 py-4 text-center sm:px-4",
                index !== stats.length - 1 ? "border-r border-slate-100" : "",
              ].join(" ")}
            >
              <stat.icon className="mx-auto h-5 w-5 text-indigo-600" />
              <div className="mt-2 text-sm font-black text-slate-950 sm:text-lg">{stat.value}</div>
              <div className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
