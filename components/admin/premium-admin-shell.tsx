"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Files,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Monitor,
  PanelLeft,
  PanelTop,
  Phone,
  Radio,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_CONTACT, SITE_WHATSAPP_HREF } from "@/lib/site-contact";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";

type ViewMode = "horizontal" | "vertical" | "floating";
type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; code?: string };
type NavGroup = { label: string; items: NavItem[] };

const horizontalNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/content", label: "Content", icon: Files },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/live-classes", label: "Live Classes", icon: Radio },
  { href: "/admin/live-classes/students", label: "Students", icon: Users },
  { href: "/admin/mentorship", label: "Bookings", icon: CalendarDays },
  { href: "/admin/ingest", label: "AI Ingestion", icon: Sparkles },
  { href: "/admin/ai-health", label: "AI Health", icon: Activity },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

const clientNavGroups: NavGroup[] = [
  {
    label: "MAIN DASHBOARD",
    items: [{ href: "/admin/dashboard", label: "Student Dashboard", icon: LayoutDashboard, code: "D1" }],
  },
  {
    label: "CONTENT MANAGEMENT",
    items: [
      { href: "/admin/content", label: "Upload Material", icon: Upload, code: "D2" },
      { href: "/admin/mock-test", label: "Mock Test", icon: TestTube2, code: "D3" },
    ],
  },
  {
    label: "BOOKING & MENTORSHIP",
    items: [
      { href: "/admin/mentorship", label: "Mentorship / Counselling Slot Booking", icon: CalendarDays, code: "D4" },
    ],
  },
  {
    label: "STUDENT SECTION",
    items: [{ href: "/admin/student-space", label: "Student Space", icon: GraduationCap, code: "D5" }],
  },
  {
    label: "LIVE CLASSES",
    items: [{ href: "/admin/live-classes", label: "Manage Live Class", icon: Radio, code: "D7" }],
  },
  {
    label: "COURSE MANAGEMENT",
    items: [{ href: "/admin/courses", label: "Manage Courses", icon: BookOpen, code: "D8" }],
  },
  {
    label: "ADMIN TOOLS",
    items: [
      { href: "/admin/live-classes/students", label: "User Registrations", icon: UserRound, code: "E1" },
      { href: "/admin/notifications", label: "Send Notification", icon: Bell, code: "E2" },
      { href: "/admin/mentorship", label: "Mentorship / Counselling Slot Booking", icon: CalendarDays, code: "E3" },
      { href: "/admin/content", label: "Upload Material", icon: Upload, code: "E4" },
      { href: "/admin/banner", label: "Manage Banner shown in Hero page", icon: Monitor, code: "E5" },
      { href: "/admin/helpdesk", label: "Help Desk Mail", icon: Mail, code: "E6" },
    ],
  },
  {
    label: "EXISTING SYSTEM TOOLS",
    items: [
      { href: "/admin/content", label: "Website Content", icon: Files },
      { href: "/admin/ingest", label: "AI Ingestion", icon: Sparkles },
      { href: "/admin/ai-health", label: "AI Health", icon: Activity },
    ],
  },
];

const allNav = clientNavGroups.flatMap((group) => group.items);
const VIEW_MODE_KEY = "ibemhal-admin-view-mode-v2";

function bestActiveHref(pathname: string, items: NavItem[]) {
  return items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function LayoutModeButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition",
        active
          ? "border-[#1853c5] bg-blue-50 text-[#123f9a] shadow-sm"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function ClientMenu({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const activeHref = bestActiveHref(pathname, allNav);

  return (
    <nav className="space-y-5 px-3 py-5">
      {clientNavGroups.map((group) => (
        <section key={group.label}>
          <div className="mb-1.5 px-2 text-[10px] font-black tracking-[0.08em] text-[#174699]">
            {group.label}
          </div>
          <div className="space-y-1">
            {group.items.map(({ href, label, icon: Icon, code }) => {
              const active = activeHref === href;
              return (
                <Link
                  key={`${group.label}-${href}-${label}`}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-[12px] font-semibold leading-tight transition",
                    active
                      ? "bg-gradient-to-r from-[#1956c7] to-[#0f49b3] text-white shadow-md shadow-blue-900/10"
                      : "text-slate-700 hover:bg-blue-50 hover:text-[#123f9a]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">{label}</span>
                  {code ? (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black",
                        active ? "bg-white/15 text-white" : "text-slate-500"
                      )}
                    >
                      {code}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function PremiumAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const [checking, setChecking] = React.useState(!isLogin);
  const [adminEmail, setAdminEmail] = React.useState("Admin");
  const [viewMode, setViewMode] = React.useState<ViewMode>("horizontal");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_MODE_KEY);
      if (saved === "horizontal" || saved === "vertical" || saved === "floating") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (isLogin) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("NO_SESSION");
        return response.json();
      })
      .then((data) => {
        if (!cancelled && data?.authenticated) {
          setAdminEmail(data.email || "Admin");
          sessionStorage.setItem("admin_auth", "true");
          sessionStorage.setItem("admin_email", data.email || "Admin");
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(`/admin/login?redirectedFrom=${encodeURIComponent(pathname)}`);
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLogin, pathname, router]);

  React.useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  const setMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      sessionStorage.removeItem("admin_auth");
      sessionStorage.removeItem("admin_email");
      router.replace("/admin/login");
      router.refresh();
    }
  };

  if (isLogin) return <>{children}</>;

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f9fc] font-sans antialiased text-[#102968]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <ShieldCheck className="h-5 w-5 animate-pulse" />
          <span className="text-sm font-extrabold">Checking admin sessionâ€¦</span>
        </div>
      </div>
    );
  }

  const activeHorizontal = bestActiveHref(pathname, horizontalNav);
  const verticalDesktop = viewMode === "vertical";
  const floatingDesktop = viewMode === "floating";

  return (
    <div
      className="min-h-screen bg-[#f7f9fc] font-sans antialiased text-slate-950"
      style={{ textRendering: "optimizeLegibility" }}
    >
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-[0_1px_8px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-[1920px] items-center gap-3 px-3 sm:px-5 lg:px-6">
          <IbemhalLogo
            href="/"
            priority
            ariaLabel="Ibemhal IAS website home"
            imageClassName="h-[48px] w-auto sm:h-[54px]"
          />

          <div className="ml-auto hidden items-center gap-5 xl:flex">
            <a href={`mailto:${SITE_CONTACT.helpdeskEmail}`} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#123f9a]">
              <Mail className="h-4 w-4" />
              {SITE_CONTACT.helpdeskEmail}
            </a>
            <a href={`tel:${SITE_CONTACT.phoneE164}`} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#123f9a]">
              <Phone className="h-4 w-4" />
              {SITE_CONTACT.phoneDisplay}
            </a>
            <a href={SITE_WHATSAPP_HREF} target="_blank" rel="noreferrer" aria-label="WhatsApp Ibemhal IAS" className="text-green-600 hover:text-green-700">
              <MessageCircle className="h-5 w-5" />
            </a>
          </div>

          <div className="relative ml-auto xl:ml-3">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm transition hover:border-slate-300"
            >
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-[#174699]">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-xs font-black text-slate-900">ADMIN</div>
                <div className="max-w-[150px] truncate text-[10px] font-medium text-slate-500">{adminEmail}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link href="/admin/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <UserRound className="h-4 w-4" /> Admin Profile
                </Link>
                <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className={cn("border-t border-slate-100 bg-white", viewMode === "horizontal" ? "hidden lg:block" : "hidden")}>
          <div className="mx-auto flex max-w-[1920px] items-center gap-1 overflow-x-auto px-4 lg:px-6">
            {horizontalNav.map(({ href, label, icon: Icon }) => {
              const active = activeHorizontal === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-[12px] font-extrabold transition",
                    active
                      ? "border-[#1452c6] text-[#123f9a]"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:text-slate-950"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1920px]">
        {verticalDesktop ? (
          <aside className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-[274px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:block">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-xs font-black text-[#174699]">ADMIN MENU</span>
              <button onClick={() => setMode("horizontal")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Switch to horizontal navigation">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <ClientMenu pathname={pathname} />
          </aside>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-[#fbfcfe] px-4 py-2.5 lg:px-7">
            <div className="flex items-center gap-2 lg:hidden">
              <button onClick={() => setDrawerOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-[#123f9a] shadow-sm">
                <Menu className="h-4 w-4" /> Menu
              </button>
            </div>

            <div className="hidden text-[11px] font-bold text-slate-400 lg:block">
              Admin Workspace
            </div>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <span className="mr-1 text-[11px] font-bold text-slate-400">View Mode:</span>
              <LayoutModeButton active={viewMode === "horizontal"} label="Horizontal" icon={PanelTop} onClick={() => setMode("horizontal")} />
              <LayoutModeButton active={viewMode === "vertical"} label="Vertical" icon={PanelLeft} onClick={() => setMode("vertical")} />
              <LayoutModeButton active={viewMode === "floating"} label="Floating" icon={Menu} onClick={() => setMode("floating")} />
            </div>
          </div>

          <main className="min-h-[calc(100vh-154px)] p-4 sm:p-5 lg:p-7">{children}</main>

          <footer className="flex flex-col gap-1 border-t border-slate-200 bg-white px-5 py-4 text-center text-[10px] font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left lg:px-7">
            <span>Â© 2026 Ibemhal IAS. All rights reserved.</span>
            <span>Created and designed by AviT-Solutions.</span>
          </footer>
        </div>
      </div>

      {floatingDesktop ? (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-6 left-6 z-40 hidden h-12 items-center gap-2 rounded-full bg-[#123f9a] px-4 text-xs font-black text-white shadow-2xl shadow-blue-950/20 lg:inline-flex"
        >
          <Menu className="h-4 w-4" /> Admin Menu
        </button>
      ) : null}

      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-5 left-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#123f9a] text-white shadow-2xl lg:hidden"
        aria-label="Open admin navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {drawerOpen ? (
        <>
          <button className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} aria-label="Close admin navigation overlay" />
          <aside className="fixed inset-y-0 left-0 z-[80] flex w-[88vw] max-w-[320px] flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <div>
                <div className="text-sm font-black text-[#123274]">Ibemhal IAS Admin</div>
                <div className="text-[10px] font-semibold text-slate-400">Navigation</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700" aria-label="Close navigation">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ClientMenu pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="border-t border-slate-200 p-3">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { setMode("horizontal"); setDrawerOpen(false); }} className="rounded-lg border px-2 py-2 text-[10px] font-black text-slate-600">Horizontal</button>
                <button onClick={() => { setMode("vertical"); setDrawerOpen(false); }} className="rounded-lg border px-2 py-2 text-[10px] font-black text-slate-600">Vertical</button>
                <button onClick={() => { setMode("floating"); setDrawerOpen(false); }} className="rounded-lg border px-2 py-2 text-[10px] font-black text-slate-600">Floating</button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}


