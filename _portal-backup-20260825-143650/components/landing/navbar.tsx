"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Menu,
  Sparkles,
  Tag,
  Trophy,
  UserRound,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/use-long-press";
import { LocalAdminAuthModal } from "@/components/admin/local-admin-auth-modal";
import { LONG_PRESS_MS, hasLocalAdminSession } from "@/lib/local-admin";

const navLinks = [
  { href: "#courses", label: "Courses", icon: BookOpen },
  { href: "#toppers", label: "Topper", icon: Trophy },
  { href: "#pricing", label: "Pricing", icon: Tag },
  { href: "#campus", label: "Campus", icon: Building2 },
  { href: "#ai-tutor", label: "AI Tutor", icon: Sparkles },
];

export function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const { handlers, progress, isPressing } = useLongPress({
    durationMs: LONG_PRESS_MS,
    onLongPress: () => {
      if (hasLocalAdminSession()) router.push("/local-admin");
      else setAuthOpen(true);
    },
    onClick: () => router.push("/"),
  });

  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "border-slate-200/80 bg-white/92 shadow-sm backdrop-blur-xl"
            : "border-transparent bg-white/82 backdrop-blur-lg"
        )}
      >
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div
            {...handlers}
            role="link"
            tabIndex={0}
            aria-label="Ibemhal IAS home"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") router.push("/");
            }}
            className="relative flex min-w-0 cursor-pointer select-none items-center gap-2 no-tap-highlight"
          >
            <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg shadow-indigo-200">
              <GraduationCap className="relative z-10 h-6 w-6 text-white" />
              {isPressing && (
                <span
                  className="absolute inset-x-0 bottom-0 bg-amber-400/80 transition-[height] duration-100"
                  style={{ height: `${progress}%` }}
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 leading-none">
              <div className="truncate text-base font-black text-slate-950 sm:text-lg">Ibemhal</div>
              <div className="mt-1 truncate text-[11px] font-bold tracking-wide text-indigo-600 sm:text-xs">
                IAS Academy
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard"
              aria-label="Student login"
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-indigo-600 shadow-sm sm:hidden"
            >
              <UserRound className="h-5 w-5" />
            </Link>

            <Link
              href="/dashboard"
              className="hidden min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm sm:inline-flex"
            >
              Student Login
            </Link>

            <Link
              href="/dashboard"
              aria-label="Get started"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 sm:px-4"
            >
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              aria-label="Close menu overlay"
              className="fixed inset-0 z-[60] bg-slate-950/35 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 top-0 z-[70] flex w-[86vw] max-w-[340px] flex-col border-r border-slate-200 bg-white p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-slate-950">Ibemhal</div>
                    <div className="text-xs font-bold text-indigo-600">IAS Academy</div>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-8 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-14 items-center gap-4 rounded-2xl px-4 text-sm font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                      <link.icon className="h-5 w-5" />
                    </span>
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="mt-auto rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="text-sm font-black text-slate-900">Need guidance?</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-600">
                  Explore courses, campus information and AI study support.
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white"
                >
                  Student Login
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <LocalAdminAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
