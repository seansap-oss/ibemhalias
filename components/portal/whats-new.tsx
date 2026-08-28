import Link from "next/link";
import { Bell, BookOpen, CalendarClock, FileText, Megaphone } from "lucide-react";

const updates = [
  {
    icon: Megaphone,
    title: "New mentorship batch",
    detail: "Admissions and counselling updates",
    href: "/mentorship",
  },
  {
    icon: FileText,
    title: "Daily Current Affairs",
    detail: "Civil Service and SSC/Banking",
    href: "/current-affairs/daily",
  },
  {
    icon: CalendarClock,
    title: "Monthly Current Affairs",
    detail: "Month-wise archive",
    href: "/current-affairs/monthly",
  },
  {
    icon: BookOpen,
    title: "Free Resources",
    detail: "NCERT books, PYQs and solutions",
    href: "/resources",
  },
];

export function WhatsNew() {
  return (
    <aside className="portal-whats-new hidden xl:block w-[210px] shrink-0 rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <Bell className="h-5 w-5 text-indigo-600" />
        <h2 className="font-black text-slate-950">What&apos;s New</h2>
      </div>

      <div className="mt-2 divide-y divide-slate-100">
        {updates.map((item) => (
          <Link key={item.title} href={item.href} className="block py-4">
            <div className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black leading-snug text-slate-900">{item.title}</div>
                <div className="mt-1 text-[11px] leading-snug text-slate-500">{item.detail}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/current-affairs/daily"
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-indigo-700"
      >
        View All Updates
      </Link>
    </aside>
  );
}
