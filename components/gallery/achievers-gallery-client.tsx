"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Crown,
  Expand,
  PartyPopper,
  Search,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react";
import {
  DEFAULT_EXAMS,
  GALLERY_YEARS,
  SEED_ACHIEVERS,
  type AchieverItem,
} from "@/lib/gallery/achievers-data";

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 100}%`,
  delay: (i % 7) * 0.14,
  duration: 2.6 + (i % 4) * 0.55,
  size: 7 + (i % 4) * 3,
  color:
    i % 3 === 0
      ? "#f3d18b"
      : i % 3 === 1
      ? "#f59e0b"
      : "#60a5fa",
  rotate: (i * 45) % 360,
}));

const BALLOONS = [
  { left: "6%", delay: 0, color: "#eab308", size: 44 },
  { left: "14%", delay: 0.35, color: "#1d4ed8", size: 38 },
  { left: "84%", delay: 0.2, color: "#f59e0b", size: 46 },
  { left: "92%", delay: 0.5, color: "#2563eb", size: 40 },
];

function CelebrationOverlay({
  winners,
  groupPhoto,
  onClose,
}: {
  winners: { rank: string; item: AchieverItem }[];
  groupPhoto: AchieverItem | null;
  onClose: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = React.useState(5);

  React.useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    const done = setTimeout(onClose, 5000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-[130] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#070f33]/95 via-[#0f1f5c]/95 to-[#162b7a]/95 p-3 backdrop-blur-md sm:p-6"
    >
      {/* Flying Gold & Royal-Blue Confetti / Ribbons */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI_PIECES.map((c) => (
          <motion.span
            key={c.id}
            initial={{ y: -40, opacity: 0, rotate: c.rotate, scale: 0.5 }}
            animate={{
              y: ["0vh", "105vh"],
              opacity: [0, 1, 1, 0],
              rotate: [c.rotate, c.rotate + 320],
              x: [0, (c.id % 2 === 0 ? 1 : -1) * 35],
              scale: [0.8, 1.15, 0.9],
            }}
            transition={{
              duration: c.duration,
              delay: c.delay,
              repeat: 1,
              ease: "easeOut",
            }}
            style={{
              left: c.left,
              width: c.size,
              height: c.id % 2 === 0 ? c.size * 1.8 : c.size,
              backgroundColor: c.color,
            }}
            className="absolute top-0 rounded-sm shadow-[0_0_10px_rgba(243,209,139,0.65)]"
          />
        ))}

        {/* Floating Balloons */}
        {BALLOONS.map((b, idx) => (
          <motion.div
            key={idx}
            initial={{ y: "100vh", opacity: 0 }}
            animate={{ y: "-25vh", opacity: [0, 0.95, 0.95, 0] }}
            transition={{ duration: 4.8, delay: b.delay, ease: "easeOut" }}
            style={{ left: b.left }}
            className="absolute bottom-0 flex flex-col items-center"
          >
            <div
              style={{
                width: b.size,
                height: b.size * 1.2,
                background: `radial-gradient(circle at 30% 30%, #fff6d6, ${b.color})`,
              }}
              className="rounded-full shadow-lg"
            />
            <div className="h-12 w-px bg-amber-200/60" />
          </motion.div>
        ))}
      </div>

      {/* Main Celebration Card */}
      <motion.div
        initial={{ scale: 0.72, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative z-10 w-full max-w-4xl rounded-3xl border border-amber-300/40 bg-[#0b1749]/90 p-5 text-white shadow-[0_0_60px_rgba(243,209,139,0.22)] sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-[11px] font-bold text-[#f3d18b]">
            <PartyPopper className="h-3.5 w-3.5" />
            Celebrating Excellence
          </span>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-amber-300/40 bg-white/10 text-xs font-black text-[#f3d18b]">
              {secondsLeft}s
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/25"
            >
              Skip to Gallery <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Gold Title */}
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-3 text-center"
        >
          <h2 className="bg-gradient-to-r from-[#f8e1a6] via-[#e6b655] to-[#fff0c2] bg-clip-text font-serif text-2xl font-black tracking-wide text-transparent sm:text-4xl">
            HALL OF FAME
          </h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#f3d18b] sm:text-sm">
            Successful Candidates &amp; Alumni
          </p>
        </motion.div>

        {/* #1, #2, #3 Toppers Spotlight */}
        {winners.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {winners.map(({ rank, item }, idx) => (
              <motion.div
                key={`${rank}-${item.id}`}
                initial={{ y: 24, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + idx * 0.12 }}
                className={`relative overflow-hidden rounded-2xl border p-3 text-center ${
                  rank === "#1"
                    ? "border-amber-300 bg-gradient-to-b from-amber-400/20 to-white/5 shadow-[0_0_25px_rgba(243,209,139,0.25)]"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <div className="mb-2 flex items-center justify-center gap-1">
                  {rank === "#1" && <Crown className="h-4 w-4 text-[#f3d18b]" />}
                  <span className="rounded-full bg-gradient-to-r from-[#f3d18b] to-[#d49b38] px-2.5 py-0.5 text-[11px] font-black text-slate-950">
                    {rank}
                  </span>
                </div>
                <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl border-2 border-amber-300/60 bg-slate-800">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="mt-2 truncate text-xs font-black text-white">
                  {item.title}
                </div>
                <div className="mt-0.5 truncate text-[10px] font-bold text-[#f3d18b]">
                  {item.rankBadge || `${item.examCategory} · ${item.year}`}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Latest Group Celebration Photo */}
        {groupPhoto && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="mt-4 overflow-hidden rounded-2xl border border-amber-300/35 bg-white/5"
          >
            <div className="relative h-32 w-full sm:h-40">
              <img
                src={groupPhoto.imageUrl}
                alt={groupPhoto.title}
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070f33] via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-black text-[#f3d18b]">
                  {groupPhoto.title}
                </span>
                <span className="shrink-0 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950">
                  {groupPhoto.year}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function AchieversGalleryClient() {
  const [items, setItems] = React.useState<AchieverItem[]>(SEED_ACHIEVERS);
  const [exams, setExams] = React.useState<string[]>(DEFAULT_EXAMS);
  const [selectedYear, setSelectedYear] = React.useState<number | "ALL">("ALL");
  const [selectedExam, setSelectedExam] = React.useState<string>("All Exams");
  const [query, setQuery] = React.useState("");
  const [activeItem, setActiveItem] = React.useState<AchieverItem | null>(null);
  const [showCelebration, setShowCelebration] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/achievers", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.items) && data.items.length) {
          setItems(data.items);
        }
        if (Array.isArray(data?.exams) && data.exams.length) {
          setExams(data.exams);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const spotlightWinners = React.useMemo(() => {
    const r1 = items.find((i) => i.spotlightRank === "rank_1") || items[0];
    const r2 = items.find((i) => i.spotlightRank === "rank_2") || items[1];
    const r3 = items.find((i) => i.spotlightRank === "rank_3") || items[2];
    const out: { rank: string; item: AchieverItem }[] = [];
    if (r1) out.push({ rank: "#1", item: r1 });
    if (r2 && r2.id !== r1?.id) out.push({ rank: "#2", item: r2 });
    if (r3 && r3.id !== r1?.id && r3.id !== r2?.id) {
      out.push({ rank: "#3", item: r3 });
    }
    return out;
  }, [items]);

  const groupPhoto = React.useMemo(() => {
    return (
      items.find((i) => i.spotlightRank === "group_latest") ||
      items.find((i) => i.cardType !== "topper") ||
      null
    );
  }, [items]);

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
    <div className="min-h-screen bg-[#f8fafc] pt-[76px] pb-16">
      {/* 4-5s Big Bang Celebration Popup */}
      <AnimatePresence>
        {showCelebration && (
          <CelebrationOverlay
            winners={spotlightWinners}
            groupPhoto={groupPhoto}
            onClose={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>

      {/* Compact Gold Header (Zero Wasted Space) */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#0e1b54] via-[#14256f] to-[#1a3285] text-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-[#f3d18b] border border-amber-300/30">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-[#f8e1a6] via-[#e6b655] to-[#fff0c2] bg-clip-text font-serif text-xl font-black tracking-tight text-transparent sm:text-2xl">
                Hall of Fame — Successful Candidates &amp; Alumni
              </h1>
              <p className="text-[11px] font-medium text-blue-100/85">
                500+ Selections · 2020–2026 Archive · UPSC, SSC, Banking &amp; State Civil Services
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCelebration(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/40 bg-amber-400/15 px-3.5 py-2 text-xs font-bold text-[#f3d18b] transition hover:bg-amber-400/25"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Replay Celebration
          </button>
        </div>
      </div>

      {/* Year & Exam Filter Bar */}
      <div className="mx-auto mt-5 max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear("ALL")}
              className={`rounded-full px-4 py-1.5 text-xs font-black transition ${
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
                className={`rounded-full px-4 py-1.5 text-xs font-black transition ${
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
              {["All Exams", ...exams].map((cat) => (
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
      <div className="mx-auto mt-8 max-w-[1400px] space-y-10 px-4 sm:px-6 lg:px-8">
        {yearsToRender.map((yr) => {
          const yearItems = filtered.filter((item) => item.year === yr);
          if (selectedYear === "ALL" && query.trim() && !yearItems.length) {
            return null;
          }

          return (
            <section key={yr} id={`year-${yr}`} className="relative">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 items-center rounded-xl bg-[#14256f] px-3.5 text-sm font-black text-white shadow-sm">
                    {yr}
                  </span>
                  <div>
                    <h2 className="text-base font-black text-slate-900 sm:text-lg">
                      {yr === 2026
                        ? "2025–2026 Latest Selections"
                        : `Class of ${yr} Achievers`}
                    </h2>
                    <p className="text-[11px] font-medium text-slate-500">
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
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-7 text-center">
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
                  {yearItems.map((item) => {
                    const isTopper = item.cardType === "topper";
                    return (
                      <article
                        key={item.id}
                        onClick={() => setActiveItem(item)}
                        className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                          isTopper
                            ? "border-amber-300 ring-1 ring-amber-200/70 hover:border-amber-400"
                            : "border-slate-200 hover:border-[#14256f]/40"
                        }`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                          />
                          <div className="absolute left-3 top-3 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#14256f]/90 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                              {item.year}
                            </span>
                            {isTopper && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-slate-950 shadow">
                                <Star className="h-3 w-3" /> Top of Class
                              </span>
                            )}
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
                          {isTopper && item.story ? (
                            <p className="mt-1 line-clamp-2 text-xs italic text-slate-600">
                              &ldquo;{item.story}&rdquo;
                            </p>
                          ) : item.subtitle ? (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                              {item.subtitle}
                            </p>
                          ) : null}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-[#14256f]">
                            <span>{isTopper ? "View Story" : "View Poster & Candidates"}</span>
                            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                          </div>
                        </div>
                      </article>
                    );
                  })}
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
