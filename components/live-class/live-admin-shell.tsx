"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, CalendarDays, DoorOpen, Package, Radio, Users } from "lucide-react";

const items = [
  { href: "/admin/live-classes", label: "Overview", icon: Radio },
  { href: "/admin/live-classes/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/admin/live-classes/students", label: "Student Access", icon: Users },
  { href: "/admin/live-classes/classrooms", label: "Classrooms", icon: DoorOpen },
  { href: "/admin/live-classes/reminders", label: "Reminders", icon: Bell },
  { href: "/admin/live-classes/attendance", label: "Attendance", icon: BarChart3 },
  { href: "/admin/live-classes/packages", label: "Packages", icon: Package },
];

export function LiveAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-[#14256f] p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
              <Radio className="h-3.5 w-3.5 text-red-400" /> Live Class Management
            </div>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">Live Class Manager</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/70">Classes, student passes, package access, rooms, attendance and automatic WhatsApp reminders.</p>
          </div>
          <Link href="/admin/live-classes/schedule" className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#14256f]">+ Schedule Class</Link>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin/live-classes" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${active ? "bg-[#14256f] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-[#14256f]"}`}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
