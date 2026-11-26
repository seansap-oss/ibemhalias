"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  FileText,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  Radio,
  Sparkles,
  TestTube2,
  Upload,
  UserPlus,
  Users,
  Video,
  IndianRupee,
  ClipboardCheck,
  ArrowUpRight,
} from "lucide-react";
import { SITE_CONTACT, SITE_WHATSAPP_HREF } from "@/lib/site-contact";

type AnyRow = Record<string, any>;

type DashboardData = {
  classes: AnyRow[];
  students: AnyRow[];
  courses: AnyRow[];
  stats: {
    totalClasses: number;
    totalStudents: number;
    liveNow: number;
    upcoming: number;
    completed: number;
    reminderSuccess: number;
  };
};

const emptyData: DashboardData = {
  classes: [],
  students: [],
  courses: [],
  stats: {
    totalClasses: 0,
    totalStudents: 0,
    liveNow: 0,
    upcoming: 0,
    completed: 0,
    reminderSuccess: 100,
  },
};

async function fetchAdminView(view: string) {
  const response = await fetch(`/api/live-class/admin?view=${encodeURIComponent(view)}`, {
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
  return data;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)] ${className}`}>{children}</section>;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</div>
          <div className="text-xs font-extrabold text-slate-700">{label}</div>
          <div className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{sub}</div>
        </div>
      </div>
    </Panel>
  );
}

const quickActions = [
  { href: "/admin/ingest", label: "AI Exam Maker", icon: Sparkles, tone: "text-blue-700" },
  { href: "/api/exam-portal/sso?next=/admin", label: "Exam Portal ↗", icon: TestTube2, tone: "text-emerald-700" },
  { href: "/admin/mock-test", label: "Mock Tests & MCQs", icon: TestTube2, tone: "text-violet-600" },
  { href: "/admin/courses/new", label: "Create Course", icon: BookOpen, tone: "text-indigo-600" },
  { href: "/admin/live-classes/students", label: "Add Student", icon: UserPlus, tone: "text-blue-600" },
  { href: "/admin/content", label: "Upload Material", icon: Upload, tone: "text-green-600" },
  { href: "/admin/live-classes/schedule", label: "Schedule Live Class", icon: Video, tone: "text-orange-600" },
  { href: "/admin/notifications", label: "Send Notification", icon: Bell, tone: "text-rose-600" },
  { href: "/admin/mentorship", label: "View Bookings", icon: CalendarDays, tone: "text-teal-600" },
];

type ActivityItem = {
  id: string;
  kind: "course" | "exam" | "mcq" | "payment" | "notification";
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  createdAt: string;
};

export function PremiumAdminDashboard() {
  const [data, setData] = React.useState<DashboardData>(emptyData);
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);
  const [aiConfigured, setAiConfigured] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchAdminView("overview"),
      fetchAdminView("students"),
      fetch("/api/admin/dashboard-activity", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .catch(() => ({ items: [] })),
    ])
      .then(([overview, students, act]) => {
        if (cancelled) return;
        setData({
          classes: overview.classes || [],
          students: students.students || [],
          courses: students.courses || [],
          stats: {
            ...emptyData.stats,
            ...(overview.stats || {}),
          },
        });
        setActivity(act?.items || []);
        if (typeof act?.aiConfigured === "boolean") {
          setAiConfigured(act.aiConfigured);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Unable to load live dashboard data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const assignedStudents = data.classes.reduce(
    (sum, row) => sum + Number(row.assigned_count || 0),
    0
  );
  const today = new Date();
  const todaysClasses = data.classes.filter((row) => {
    const start = row.starts_at ? new Date(row.starts_at) : null;
    return start && start.toDateString() === today.toDateString();
  });

  const stats = [
    {
      label: "Total Students",
      value: data.stats.totalStudents,
      sub: loading ? "Loading current records…" : "Registered student profiles",
      icon: Users,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Courses",
      value: data.courses.length,
      sub: loading ? "Loading current catalogue…" : "Saved course records",
      icon: BookOpen,
      tone: "bg-green-50 text-green-600",
    },
    {
      label: "Live Classes",
      value: data.stats.totalClasses,
      sub: `${data.stats.liveNow} live now · ${data.stats.upcoming} upcoming`,
      icon: Radio,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      label: "Bookings Today",
      value: "—",
      sub: "Mentorship booking panel",
      icon: CalendarDays,
      tone: "bg-orange-50 text-orange-600",
    },
    {
      label: "Unread Messages",
      value: "—",
      sub: "Help desk / notification panel",
      icon: Mail,
      tone: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950">Dashboard Overview</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Welcome back, Admin. Here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm sm:self-auto">
          <CalendarDays className="h-4 w-4" />
          {today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          Live dashboard data could not be loaded yet: {error}. Navigation and admin tools remain available.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Panel className="p-4">
        <div className="mb-3 text-sm font-black tracking-[-0.02em] text-[#174699]">Quick Actions</div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {quickActions.map(({ href, label, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-center text-xs font-extrabold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <Icon className={`h-4 w-4 ${tone}`} />
              {label}
            </Link>
          ))}
        </div>
      </Panel>

      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black text-[#174699]">Recent Courses</h2><Link href="/admin/courses" className="text-[11px] font-black text-[#174699] hover:underline">Manage all →</Link></div>
        <div className="grid gap-2 md:grid-cols-3">{data.courses.slice(0, 3).map((course) => <Link key={course.id} href={`/admin/courses/${course.id}/edit`} className="rounded-xl border p-3 text-xs hover:bg-slate-50"><b className="block text-slate-900">{course.title}</b><span className="mt-1 block text-slate-500">{course.is_published ? "Published" : "Draft"} · ₹{Number(course.price_inr || 0).toLocaleString("en-IN")}</span></Link>)}{!data.courses.length && <p className="text-xs text-slate-500">No saved courses yet. Create one, then publish it to show it on the public site.</p>}</div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <h2 className="text-sm font-black text-[#174699]">Recent Student Registrations</h2>
            <Link href="/admin/live-classes/students" className="text-[11px] font-black text-[#174699] hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-black">#</th>
                  <th className="px-3 py-2.5 font-black">Student Name</th>
                  <th className="px-3 py-2.5 font-black">Email</th>
                  <th className="px-3 py-2.5 font-black">Mobile</th>
                  <th className="px-3 py-2.5 font-black">Student ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.students.slice(0, 5).map((student, index) => (
                  <tr key={student.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-bold text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2.5 font-extrabold text-slate-800">{student.full_name || "Student"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{student.email || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{student.phone || "—"}</td>
                    <td className="px-3 py-2.5 font-bold text-[#174699]">{student.student_code || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !data.students.length ? (
            <div className="px-4 py-8 text-center text-xs font-semibold text-slate-400">No student registrations yet.</div>
          ) : null}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <h2 className="text-sm font-black text-[#174699]">Live Classes Today</h2>
            <Link href="/admin/live-classes" className="text-[11px] font-black text-[#174699] hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-slate-100 px-4">
            {(todaysClasses.length ? todaysClasses : data.classes.slice(0, 4)).map((row) => (
              <Link key={row.id} href={`/admin/live-classes/classes/${row.id}`} className="flex items-center gap-3 py-3 text-xs hover:bg-slate-50/80">
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold text-slate-800">{row.title || "Live Class"}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                    {row.starts_at ? new Date(row.starts_at).toLocaleString() : "Schedule pending"}
                  </div>
                </div>
                <span className="rounded-md bg-[#174699] px-2 py-1 text-[9px] font-black uppercase text-white">{row.status || "scheduled"}</span>
              </Link>
            ))}
          </div>
          {!loading && !data.classes.length ? (
            <div className="px-4 py-8 text-center text-xs font-semibold text-slate-400">No live classes scheduled yet.</div>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr_.8fr]">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#174699]">Material Upload Summary</h2>
            <Link href="/admin/content" className="text-[11px] font-black text-[#174699] hover:underline">View All</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            {[
              ["PDF Documents", FileText, "bg-rose-50 text-rose-600"],
              ["Video Lectures", Video, "bg-green-50 text-green-600"],
              ["Study Materials", BookOpen, "bg-violet-50 text-violet-600"],
              ["Total Uploads", Upload, "bg-blue-50 text-blue-600"],
            ].map(([label, Icon, tone]: any) => (
              <Link key={label} href="/admin/content" className="rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:shadow-sm">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
                <div className="mt-3 text-[11px] font-black text-slate-800">{label}</div>
                <div className="mt-1 text-[10px] font-semibold text-slate-400">Open CMS</div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="text-sm font-black text-[#174699]">System Overview</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-500">Total Users</span><b>{data.stats.totalStudents}</b></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-500">Assigned Seats</span><b>{assignedStudents}</b></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-500">Total Courses</span><b>{data.courses.length}</b></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-500">Reminder Success</span><b>{data.stats.reminderSuccess}%</b></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-500">System Status</span><span className="inline-flex items-center gap-1.5 font-black text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" /> Operational</span></div>
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="text-sm font-black text-[#174699]">Help Desk</h2>
          <p className="mt-3 text-[11px] font-medium text-slate-500">For support or queries, contact:</p>
          <div className="mt-3 space-y-2.5 text-[11px] font-bold">
            <a href={`mailto:${SITE_CONTACT.helpdeskEmail}`} className="flex items-center gap-2 text-[#174699] hover:underline"><Mail className="h-4 w-4" /> {SITE_CONTACT.helpdeskEmail}</a>
            <a href={`tel:${SITE_CONTACT.phoneE164}`} className="flex items-center gap-2 text-slate-700 hover:text-[#174699]"><Phone className="h-4 w-4" /> {SITE_CONTACT.phoneDisplay}</a>
            <a href={SITE_WHATSAPP_HREF} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-green-600 hover:text-green-700"><MessageCircle className="h-4 w-4" /> {SITE_CONTACT.phoneDisplay}</a>
          </div>
          <a href={`mailto:${SITE_CONTACT.helpdeskEmail}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1b5bd2] px-3 py-2 text-[11px] font-black text-[#174699] hover:bg-blue-50">
            <Mail className="h-4 w-4" /> Send Mail
          </a>
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[#174699]">Recent Admin Activity (Courses, Exams, MCQs, Payments &amp; Emails)</h2>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              Everything created or received in the Admin workspace appears here with direct links.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {aiConfigured === false && (
              <Link
                href="/admin/ai-health"
                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-800"
              >
                AI Key Missing (Offline MCQ Mode)
              </Link>
            )}
            <Link href="/admin/mock-test" className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black text-[#174699] hover:bg-slate-50">
              Open Exam Conductor
            </Link>
          </div>
        </div>

        <div className="mt-3 divide-y divide-slate-100">
          {activity.length ? (
            activity.map((item) => {
              const Icon =
                item.kind === "course"
                  ? BookOpen
                  : item.kind === "exam"
                  ? ClipboardCheck
                  : item.kind === "mcq"
                  ? TestTube2
                  : item.kind === "payment"
                  ? IndianRupee
                  : Mail;
              const tone =
                item.kind === "course"
                  ? "bg-indigo-50 text-indigo-700"
                  : item.kind === "exam"
                  ? "bg-blue-50 text-blue-700"
                  : item.kind === "mcq"
                  ? "bg-violet-50 text-violet-700"
                  : item.kind === "payment"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700";
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-slate-50/80 px-2 rounded-lg"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-900">{item.title}</div>
                      <div className="text-[10px] font-medium text-slate-500">
                        {item.subtitle} · {new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {item.badge}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs font-semibold text-slate-400">
              {loading ? "Loading recent activity…" : "No recent admin activity yet."}
            </div>
          )}
        </div>
      </Panel>

      <Panel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[#174699]">Live Class Access & Assignment</h2>
            <p className="mt-1 text-[10px] font-medium text-slate-400">Student IDs, package access and class assignments remain connected to the Live Class Manager.</p>
          </div>
          <Link href="/admin/live-classes/students" className="rounded-lg bg-[#174699] px-3 py-2 text-[10px] font-black text-white">Manage Access</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-3"><Users className="h-4 w-4 text-blue-600" /><div className="mt-2 text-xl font-black">{assignedStudents}</div><div className="text-[10px] font-bold text-slate-400">Assigned Students</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><Radio className="h-4 w-4 text-green-600" /><div className="mt-2 text-xl font-black">{data.stats.totalClasses}</div><div className="text-[10px] font-bold text-slate-400">Active / Scheduled Classes</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><Bell className="h-4 w-4 text-orange-600" /><div className="mt-2 text-xl font-black">{data.stats.reminderSuccess}%</div><div className="text-[10px] font-bold text-slate-400">Reminder Success</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><PackageCheck className="h-4 w-4 text-violet-600" /><div className="mt-2 text-xl font-black">{data.courses.length}</div><div className="text-[10px] font-bold text-slate-400">Packages / Courses</div></div>
        </div>
      </Panel>
    </div>
  );
}
