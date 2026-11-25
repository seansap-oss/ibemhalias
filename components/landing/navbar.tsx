"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  FileQuestion,
  GraduationCap,
  LogOut,
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

type UserSession = {
  authenticated: boolean;
  role?: string;
  label?: string;
  href?: string;
  name?: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [session, setSession] = React.useState<UserSession | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session-state", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data: UserSession) => {
        if (!cancelled && data) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession({ authenticated: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
      await fetch("/api/activity/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      }).catch(() => undefined);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (supabase) await supabase.auth.signOut().catch(() => undefined);
    } finally {
      sessionStorage.removeItem("admin_auth");
      sessionStorage.removeItem("admin_email");
      setSession({ authenticated: false });
      router.refresh();
    }
  };

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
      <header className="site-navbar fixed inset-x-0 top-0 z-50 border-b border-slate-200/75 bg-white/95 backdrop-blur-xl">
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
            {session?.authenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  href={session.href || "/dashboard"}
                  className="hidden min-h-11 items-center gap-2.5 rounded-xl bg-[#14256f] px-3.5 py-1.5 text-xs font-black text-white shadow-md shadow-blue-950/15 transition hover:bg-[#1d348f] sm:inline-flex"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/20 text-[11px] font-black uppercase text-white">
                    {(session.name || session.role || "U")[0]}
                  </span>
                  <div className="text-left leading-tight">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-blue-200">
                      {session.label}
                    </div>
                    <div className="max-w-[130px] truncate text-xs font-bold text-white">
                      {session.name}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-white/60" />
                </Link>
                <Link
                  href={session.href || "/dashboard"}
                  aria-label={session.label || "Dashboard"}
                  className="grid h-11 w-11 place-items-center rounded-xl bg-[#14256f] text-white sm:hidden"
                >
                  <span className="text-xs font-black uppercase">
                    {(session.name || session.role || "U")[0]}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out"
                  className="hidden h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-red-600 sm:grid"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#14256f] px-5 text-sm font-black text-white shadow-md shadow-blue-950/15 transition hover:bg-[#1d348f] sm:inline-flex"
                >
                  <UserRound className="h-4 w-4" />
                  Portal Login
                </Link>
                <Link
                  href="/login"
                  aria-label="Portal login"
                  className="grid h-11 w-11 place-items-center rounded-xl bg-[#14256f] text-white sm:hidden"
                >
                  <UserRound className="h-5 w-5" />
                </Link>
              </>
            )}
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
              className="site-mobile-drawer fixed inset-y-0 left-0 z-[70] flex w-[88vw] max-w-[360px] flex-col bg-gradient-to-b from-[#14256f] via-[#15327f] to-[#0d225f] p-4 text-white shadow-2xl"
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

              <div className="mt-auto space-y-2 pt-5">
                {session?.authenticated ? (
                  <>
                    <Link
                      href={session.href || "/dashboard"}
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#14256f] shadow-lg"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#14256f] text-xs font-black text-white">
                          {(session.name || session.role || "U")[0]}
                        </span>
                        <div className="text-left">
                          <div className="text-[10px] font-extrabold uppercase text-slate-500">
                            {session.label}
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            {session.name}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void handleLogout();
                      }}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/20 text-xs font-bold text-white hover:bg-white/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Log Out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-[#14256f] shadow-lg"
                  >
                    <UserRound className="h-4 w-4" />
                    Portal Login
                  </Link>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <LocalAdminAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}


