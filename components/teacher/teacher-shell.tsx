"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarPlus,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/teacher/live-classes",
    label: "My Classes",
    icon: Radio,
    permission: "can_live_classes",
  },
  {
    href: "/teacher/schedule",
    label: "Schedule Class",
    icon: CalendarPlus,
    permission: "can_schedule_classes",
  },
  { href: "/teacher/courses", label: "My Courses", icon: BookOpen },
  {
    href: "/teacher/materials",
    label: "Study Material",
    icon: FileText,
    permission: "can_study_materials",
  },
  {
    href: "/teacher/attendance",
    label: "Attendance",
    icon: Users,
    permission: "can_attendance",
  },
  { href: "/teacher/profile", label: "Profile", icon: UserRound },
];

export function TeacherShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("Teacher");
  const [email, setEmail] = React.useState("");
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>(
    {}
  );

  React.useEffect(() => {
    fetch("/api/teacher/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("NO_SESSION");
        return response.json();
      })
      .then((data) => {
        setName(data?.staff?.fullName || "Teacher");
        setEmail(data?.staff?.email || "");
        setPermissions(data?.permissions || {});
      })
      .catch(() => {
        router.replace("/staff/login?role=teacher");
      });
  }, [router]);

  if (pathname.includes("/teacher/live-classes/studio/")) {
    return <>{children}</>;
  }

  const logout = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/staff/login?role=teacher");
    router.refresh();
  };

  const visibleNav = nav.filter(
    (item) => !item.permission || permissions[item.permission] !== false
  );

  const menu = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-5 py-5">
        <IbemhalLogo
          href="/teacher/dashboard"
          imageClassName="h-[50px] w-auto"
        />
        <div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300">
          Teacher Portal
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                active
                  ? "bg-indigo-500 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 rounded-2xl bg-white/5 p-3">
          <div className="truncate text-xs font-black text-white">{name}</div>
          <div className="mt-1 truncate text-[10px] text-slate-400">
            {email}
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-[#0c1427] lg:block">
        {menu}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative h-full w-[280px] bg-[#0c1427]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {menu}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mr-3 grid h-10 w-10 place-items-center rounded-xl border border-slate-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <div className="text-sm font-black text-[#102968]">IBEMHAL IAS</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
              Teacher Workspace
            </div>
          </div>

          {permissions.can_live_classes !== false ? (
            <Link
              href="/teacher/live-classes"
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
            >
              <Radio className="h-4 w-4" />
              Live Now
            </Link>
          ) : null}
        </header>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
