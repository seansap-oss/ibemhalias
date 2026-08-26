"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Building2,
  CalendarDays,
  FileQuestion,
  GraduationCap,
  Mail,
  Menu,
  Newspaper,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useLongPress } from "@/hooks/use-long-press";
import { LocalAdminAuthModal } from "@/components/admin/local-admin-auth-modal";
import { LONG_PRESS_MS, hasLocalAdminSession } from "@/lib/local-admin";
import { portalNavItems } from "@/components/portal/nav-items";
import { SITE_CONTACT } from "@/lib/site-contact";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";

export function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);

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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/75 bg-white/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-[76px] max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#14256f] shadow-sm lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div
            {...handlers}
            role="link"
            tabIndex={0}
            className="relative flex cursor-pointer select-none items-center gap-2"
          >
            <IbemhalLogo
              href="/"
              priority
              imageClassName="h-[52px] w-auto sm:h-[58px]"
              className="pointer-events-none"
            />
          </div>

          <div className="ml-auto hidden items-center gap-2 xl:flex">
            <Mail className="h-4 w-4 text-amber-500" />
            <a href={`mailto:${SITE_CONTACT.helpdeskEmail}`} className="text-sm font-semibold text-slate-700 transition hover:text-[#14256f]">{SITE_CONTACT.helpdeskEmail}</a>
          </div>

          <div className="ml-auto flex items-center gap-2 xl:ml-5">
            <Link
              href="/login"
              className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#14256f] px-4 text-sm font-black text-white shadow-md sm:inline-flex"
            >
              <UserRound className="h-4 w-4" />
              Student Login
            </Link>
            <Link
              href="/admin/login"
              className="hidden min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-[#14256f] shadow-sm md:inline-flex"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Login
            </Link>
            <Link
              href="/login"
              aria-label="Student login"
              className="grid h-11 w-11 place-items-center rounded-xl bg-[#14256f] text-white sm:hidden"
            >
              <UserRound className="h-5 w-5" />
            </Link>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu overlay"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-[70] flex w-[88vw] max-w-[360px] flex-col bg-gradient-to-b from-[#14256f] via-[#15327f] to-[#0d225f] p-4 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-black">Ibemhal IAS</div>
                  <div className="text-xs font-bold text-blue-200">Portal Navigation</div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-7 space-y-2">
                {portalNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black transition hover:bg-white/15"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white text-xs font-black text-[#14256f]"
                >
                  Student Login
                </Link>
                <Link
                  href="/admin/login"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 text-xs font-black text-white"
                >
                  Admin Login
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


