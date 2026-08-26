"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileType2,
  HelpCircle,
  Globe2,
  Home,
  Image as ImageIcon,
  LibraryBig,
  Radio,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Play,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { SITE_CONTACT, SITE_WHATSAPP_HREF } from "@/lib/site-contact";
import { createClient } from "@/lib/supabase/client";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";
import { cleanDisplayText } from "@/lib/text/clean-display-text";
import { formatFileSize } from "@/lib/cms/media";
import { StudentMaterialViewer } from "./student-material-viewer";

type AnyRow = Record<string, any>;

type PortalData = {
  profile: AnyRow;
  courses: AnyRow[];
  liveClasses: AnyRow[];
  materials: AnyRow[];
  announcements: AnyRow[];
  stats: {
    enrolledCourses: number;
    liveClasses: number;
    studyMaterials: number;
    studyStreak: number;
  };
};

const NAV = [
  ["dashboard", "Dashboard", Home],
  ["courses", "My Courses", BookOpen],
  ["live", "Live Classes", Radio],
  ["materials", "Study Materials", LibraryBig],
  ["mock", "Mock Tests", ClipboardCheck],
  ["assignments", "Assignments", CheckCircle2],
  ["progress", "My Progress", TrendingUp],
  ["downloads", "Downloads", Download],
  ["bookmarks", "Bookmarks", Bookmark],
  ["announcements", "Announcements", Bell],
  ["profile", "Profile & Settings", UserRound],
  ["help", "Help & Support", HelpCircle],
] as const;

function initials(name: string) {
  return cleanDisplayText(name || "Student")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

function materialIcon(type: string) {
  if (type === "video" || type === "youtube") return Video;
  if (type === "audio") return FileAudio;
  if (type === "word") return FileType2;
  if (type === "excel") return FileSpreadsheet;
  if (type === "image") return ImageIcon;
  return FileText;
}

function percent(value: unknown) {
  const n = Number(value || 0);
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

function Sidebar({
  view,
  mobile,
  onNavigate,
}: {
  view: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <aside className={[
      "flex h-full flex-col border-r border-slate-200 bg-white",
      mobile ? "w-[290px] shadow-2xl" : "w-[260px]",
    ].join(" ")}>
      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-1">
          {NAV.map(([key, label, Icon]) => {
            const href = `/dashboard?view=${key}`;
            const active = view === key;
            return (
              <Link
                key={key}
                href={href}
                onClick={onNavigate}
                className={[
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition",
                  active
                    ? "bg-gradient-to-r from-[#174699] to-[#2459c5] text-white shadow-sm"
                    : "text-slate-700 hover:bg-blue-50 hover:text-[#174699]",
                ].join(" ")}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-black text-[#14256f] transition hover:bg-blue-50"
        >
          <Globe2 className="h-4.5 w-4.5" />
          Go to Ibemhal IAS Website
        </Link>
      </div>

      <div className="m-3 mt-0 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="flex items-center gap-2 text-sm font-black text-[#14256f]"><HelpCircle className="h-4 w-4" /> Need Help?</div>
        <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-600">Contact our help desk for course access, premium materials or technical assistance.</p>
        <a href={`mailto:${SITE_CONTACT.helpdeskEmail}`} className="mt-3 flex items-center gap-2 break-all text-[10px] font-black text-[#174699]"><Mail className="h-3.5 w-3.5 shrink-0" /> {SITE_CONTACT.helpdeskEmail}</a>
        <a href={`tel:${SITE_CONTACT.phoneE164}`} className="mt-2 flex items-center gap-2 text-[10px] font-black text-slate-700"><MessageCircle className="h-3.5 w-3.5" /> {SITE_CONTACT.phoneDisplay}</a>
        <a href={SITE_WHATSAPP_HREF} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 text-[11px] font-black text-white"><MessageCircle className="h-4 w-4" /> Message Us</a>
      </div>
    </aside>
  );
}

function StatCard({ icon: Icon, label, value, href, tone }: any) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    violet: "bg-violet-50 text-violet-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tones[tone] || tones.blue}`}><Icon className="h-6 w-6" /></div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-[11px] font-black text-[#174699]">View details <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></div>
    </Link>
  );
}

function CourseRow({ course }: { course: AnyRow }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center">
      <div className="h-24 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#14256f] to-[#2459c5] sm:w-44">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-3xl font-black text-white/90">{cleanDisplayText(course.title || "I")[0]}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-black text-slate-950">{cleanDisplayText(course.title)}</h3>
          {course.category ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600">{cleanDisplayText(course.category)}</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
          <span>{course.lessonCount || 0} lessons</span>
          <span>Enrolled {course.enrolledAt ? new Date(course.enrolledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "â€”"}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#174699] to-[#2d6cdf]" style={{ width: `${percent(course.progressPercent)}%` }} /></div>
          <span className="w-10 text-right text-[10px] font-black text-slate-500">{percent(course.progressPercent)}%</span>
        </div>
      </div>
      <Link href={`/learn/${course.slug}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#174699] px-4 text-xs font-black text-white hover:bg-[#103a84]">Continue <ChevronRight className="h-4 w-4" /></Link>
    </div>
  );
}

function LiveClassRow({ item }: { item: AnyRow }) {
  const date = item.starts_at ? new Date(item.starts_at) : null;
  const replay = item.status === "completed" && item.recording_url;
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-blue-50 text-center text-[#174699]">
        <div><div className="text-base font-black leading-none">{date ? date.getDate() : "â€”"}</div><div className="mt-1 text-[9px] font-black uppercase">{date ? date.toLocaleDateString("en-IN", { month: "short" }) : "TBA"}</div></div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-slate-950">{cleanDisplayText(item.title)}{item.topic ? ` â€” ${cleanDisplayText(item.topic)}` : ""}</div>
        <div className="mt-1 text-[10px] font-semibold text-slate-500">{date ? date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Schedule TBA"}{item.faculty_name ? ` Â· ${cleanDisplayText(item.faculty_name)}` : ""}</div>
      </div>
      <Link href={`/live-classes/${item.id}`} className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-[#1f5fd0] px-3 text-[11px] font-black text-white">{replay ? "Replay" : item.status === "live" ? "Join Now" : "View"}</Link>
    </div>
  );
}

function MaterialCard({ material, onOpen, onBookmark }: { material: AnyRow; onOpen: () => void; onBookmark: () => void }) {
  const Icon = materialIcon(material.media_type);
  const progress = percent(material.progress?.progress_percent);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <button onClick={onBookmark} className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-600 shadow" aria-label="Bookmark material">
        <Bookmark className={`h-4 w-4 ${material.progress?.bookmarked ? "fill-[#174699] text-[#174699]" : ""}`} />
      </button>
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative grid aspect-[16/9] place-items-center bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#174699] shadow-sm"><Icon className="h-7 w-7" /></div>
          <div className="absolute left-2 top-2 rounded-md bg-[#174699] px-2 py-1 text-[9px] font-black uppercase text-white">{material.media_type}</div>
          {material.locked ? <div className="absolute inset-0 grid place-items-center bg-white/72 backdrop-blur-[1px]"><div className="rounded-full bg-amber-100 p-3 text-amber-700"><LockKeyhole className="h-6 w-6" /></div></div> : null}
        </div>
        <div className="p-3">
          <div className="line-clamp-2 min-h-10 text-xs font-black leading-snug text-slate-950">{cleanDisplayText(material.title)}</div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-bold text-slate-500">
            <span>{cleanDisplayText(material.course_title || material.section_label || "Study Material")}</span>
            <span className={material.access_level === "premium" ? "text-amber-700" : "text-green-700"}>{material.access_level === "premium" ? "Premium" : "Free"}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2d6cdf]" style={{ width: `${progress}%` }} /></div>
          <div className="mt-1 text-right text-[9px] font-bold text-slate-400">{material.locked ? "Locked" : material.progress?.completed ? "Completed" : `${progress}%`}</div>
        </div>
      </button>
    </div>
  );
}

export function StudentPortal() {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") || "dashboard";
  const [mobileMenu, setMobileMenu] = React.useState(false);
  const [profileMenu, setProfileMenu] = React.useState(false);
  const [data, setData] = React.useState<PortalData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeMaterial, setActiveMaterial] = React.useState<AnyRow | null>(null);
  const [materialSearch, setMaterialSearch] = React.useState("");
  const [materialFilter, setMaterialFilter] = React.useState<"all" | "free" | "premium">("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/dashboard", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/login?next=/dashboard";
        return;
      }
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setData(payload.data);
    } catch (err: any) {
      setError(err?.message || "Unable to load the student portal.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const updateMaterialProgress = async (contentId: string, action: "open" | "bookmark" | "complete") => {
    const response = await fetch("/api/student/material-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, action }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Unable to update progress.");
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        materials: current.materials.map((item) => item.id === contentId ? { ...item, progress: { ...(item.progress || {}), ...(payload.progress || {}) } } : item),
      };
    });
    return payload.progress;
  };

  const openMaterial = async (material: AnyRow) => {
    if (material.locked) {
      setActiveMaterial(material);
      return;
    }
    try { await updateMaterialProgress(material.id, "open"); } catch {}
    setActiveMaterial(material);
  };

  const bookmark = async (material: AnyRow) => {
    try { await updateMaterialProgress(material.id, "bookmark"); } catch (err: any) { setError(err?.message || "Unable to bookmark material."); }
  };

  const signOut = async () => {
    try {
      const supabase = createClient();
      if (supabase) await supabase.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#174699]" /><div className="mt-4 text-sm font-black text-slate-600">Loading your Ibemhal IAS portalâ€¦</div></div></div>;
  }

  if (error || !data) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 p-5"><div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow"><div className="text-lg font-black text-slate-950">Student Portal</div><div className="mt-2 text-sm text-red-700">{error || "Unable to load your account."}</div><button onClick={() => void load()} className="mt-4 min-h-10 rounded-xl bg-[#174699] px-5 text-sm font-black text-white">Try Again</button></div></div>;
  }

  const name = cleanDisplayText(data.profile?.full_name || "Student");
  const upcoming = data.liveClasses.slice(0, 4);
  const featuredMaterials = data.materials.filter((m) => !m.locked).slice(0, 4);
  const bookmarked = data.materials.filter((m) => m.progress?.bookmarked);
  const visibleMaterials = data.materials.filter((m) => {
    const q = materialSearch.trim().toLowerCase();
    const matchText = !q || `${m.title} ${m.description || ""} ${m.course_title || ""}`.toLowerCase().includes(q);
    const matchFilter = materialFilter === "all" || m.access_level === materialFilter;
    return matchText && matchFilter;
  });

  const content = view === "profile" ? (
    <Section title="Profile & Settings" subtitle="Your Ibemhal IAS Student ID and account details stay inside the Student Portal.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#174699] to-[#2e6bd6] text-lg font-black text-white">{initials(name)}</div>
            <div><div className="text-xl font-black text-slate-950">{name}</div><div className="mt-1 text-xs font-bold text-[#174699]">{cleanDisplayText(data.profile?.student_code || "Student ID pending")}</div></div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <ProfileField label="Email" value={data.profile?.email || "â€”"} />
            <ProfileField label="Phone" value={data.profile?.phone || "â€”"} />
            <ProfileField label="Access Tier" value={data.profile?.tier || "free"} />
            <ProfileField label="Assigned Courses" value={String(data.stats.enrolledCourses)} />
            <ProfileField label="Assigned Live Classes" value={String(data.stats.liveClasses)} />
            <ProfileField label="Accessible Materials" value={String(data.stats.studyMaterials)} />
          </dl>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><div className="text-sm font-black text-[#14256f]">Student Portal Navigation</div><p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">Courses, classes, materials, downloads, bookmarks and profile tools remain inside this private Student Portal.</p></div>
          <Link href="/" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#14256f] px-4 text-sm font-black text-white"><Globe2 className="h-4 w-4" /> Go to Ibemhal IAS Website</Link>
          <button onClick={() => void signOut()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700"><LogOut className="h-4 w-4" /> Sign Out</button>
        </div>
      </div>
    </Section>
  ) : view === "mock" ? (
    <Section title="Mock Tests" subtitle="Mock tests assigned to your Student ID will appear here without leaving the Student Portal.">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto max-w-xl py-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#174699]"><ClipboardCheck className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-black text-slate-950">No assigned mock tests yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">When Ibemhal IAS assigns a paid or student-specific mock test, it will appear here. Public/free material remains on the main website.</p>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#14256f] px-5 text-sm font-black text-white"><Globe2 className="h-4 w-4" /> Browse Main Website</Link>
        </div>
      </div>
    </Section>
  ) : view === "courses" ? (
    <Section title="My Courses" subtitle="Courses and packages assigned to your Student ID."><div className="rounded-2xl border border-slate-200 bg-white px-4">{data.courses.length ? data.courses.map((c) => <CourseRow key={c.id} course={c} />) : <Empty text="No courses have been assigned yet." />}</div></Section>
  ) : view === "live" ? (
    <Section title="Live Classes" subtitle="Only classes assigned to your Student ID appear here."><div className="rounded-2xl border border-slate-200 bg-white px-4">{data.liveClasses.length ? data.liveClasses.map((c) => <LiveClassRow key={c.id} item={c} />) : <Empty text="No live classes have been assigned yet." />}</div></Section>
  ) : view === "materials" ? (
    <Section title="Study Materials" subtitle="PDFs are the primary study format, with video, audio, Word, Excel and other supported resources when available.">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} placeholder="Search study materialsâ€¦" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#174699]" /></div>
        <div className="flex gap-2">{(["all","free","premium"] as const).map((key) => <button key={key} onClick={() => setMaterialFilter(key)} className={`min-h-11 rounded-xl border px-4 text-xs font-black capitalize ${materialFilter === key ? "border-[#174699] bg-[#174699] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{key}</button>)}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{visibleMaterials.map((m) => <MaterialCard key={m.id} material={m} onOpen={() => void openMaterial(m)} onBookmark={() => void bookmark(m)} />)}</div>
      {!visibleMaterials.length ? <Empty text="No study materials match this filter." /> : null}
    </Section>
  ) : view === "assignments" ? (
    <Section title="Assignments" subtitle="Your assigned learning plan follows the courses, live classes and materials approved by the admin."><div className="grid gap-4 md:grid-cols-3"><MiniSummary label="Assigned Courses" value={data.courses.length} /><MiniSummary label="Assigned Live Classes" value={data.liveClasses.length} /><MiniSummary label="Available Study Materials" value={data.stats.studyMaterials} /></div><div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><div className="text-sm font-black text-slate-950">Current learning plan</div><div className="mt-4 space-y-2">{data.courses.map((c) => <div key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-sm font-bold text-slate-700">{c.title}</span></div>)}</div>{!data.courses.length ? <Empty text="No course assignment yet." /> : null}</div></Section>
  ) : view === "progress" ? (
    <Section title="My Progress" subtitle="Progress is calculated from your real enrolled courses and material activity."><div className="grid gap-4 lg:grid-cols-2">{data.courses.map((c) => <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="font-black text-slate-950">{c.title}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2d6cdf]" style={{ width: `${percent(c.progressPercent)}%` }} /></div><div className="mt-2 text-xs font-bold text-slate-500">{percent(c.progressPercent)}% Â· {c.completedLessons || 0}/{c.lessonCount || 0} lessons completed</div></div>)}</div><div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><div className="font-black text-slate-950">Material Progress</div><div className="mt-4 space-y-3">{data.materials.filter((m) => !m.locked).slice(0,10).map((m) => <div key={m.id}><div className="flex justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-700">{m.title}</span><span className="font-black text-slate-500">{m.progress?.completed ? "100%" : `${percent(m.progress?.progress_percent)}%`}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-500" style={{width:`${m.progress?.completed ? 100 : percent(m.progress?.progress_percent)}%`}} /></div></div>)}</div></div></Section>
  ) : view === "downloads" ? (
    <Section title="Downloads" subtitle="Download only the materials your account is allowed to access."><div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">{data.materials.filter((m) => !m.locked && m.media_url).map((m) => <div key={m.id} className="flex items-center gap-3 p-4"><FileText className="h-5 w-5 text-[#174699]" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-black text-slate-900">{m.title}</div><div className="text-[10px] uppercase text-slate-400">{m.media_type} Â· {formatFileSize(m.file_size)}</div></div><a href={m.media_url} download className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#174699] px-3 text-[11px] font-black text-white"><Download className="h-4 w-4" /> Download</a></div>)}</div></Section>
  ) : view === "bookmarks" ? (
    <Section title="Bookmarks" subtitle="Your saved study materials."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{bookmarked.map((m) => <MaterialCard key={m.id} material={m} onOpen={() => void openMaterial(m)} onBookmark={() => void bookmark(m)} />)}</div>{!bookmarked.length ? <Empty text="You have not bookmarked any materials yet." /> : null}</Section>
  ) : view === "announcements" ? (
    <Section title="Announcements" subtitle="Updates generated from your assigned classes and newly published study materials."><AnnouncementList items={data.announcements} /></Section>
  ) : view === "help" ? (
    <Section title="Help & Support" subtitle="Contact the Ibemhal IAS help desk."><div className="grid gap-4 md:grid-cols-3"><ContactCard icon={Mail} label="Email Help Desk" value={SITE_CONTACT.helpdeskEmail} href={`mailto:${SITE_CONTACT.helpdeskEmail}`} /><ContactCard icon={MessageCircle} label="WhatsApp" value={SITE_CONTACT.phoneDisplay} href={SITE_WHATSAPP_HREF} external /><ContactCard icon={HelpCircle} label="Call" value={SITE_CONTACT.phoneDisplay} href={`tel:${SITE_CONTACT.phoneE164}`} /></div></Section>
  ) : (
    <DashboardHome data={data} name={name} onOpen={openMaterial} onBookmark={bookmark} />
  );

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-slate-950 antialiased">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="flex min-h-[86px] items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenu(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 lg:hidden" aria-label="Open student menu"><Menu className="h-5 w-5" /></button>
            <IbemhalLogo
              href="/"
              priority
              imageClassName="h-[58px] w-auto sm:h-[64px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard?view=announcements" className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-[#14256f]"><Bell className="h-5 w-5" />{data.announcements.length ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#1f5fd0] px-1 text-[9px] font-black text-white">{Math.min(9, data.announcements.length)}</span> : null}</Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenu((value) => !value)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm"
                aria-expanded={profileMenu}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#174699] to-[#2e6bd6] text-xs font-black text-white">{initials(name)}</span>
                <div className="hidden text-left sm:block"><div className="text-[10px] font-semibold text-slate-400">Student</div><div className="max-w-[150px] truncate text-xs font-black text-slate-800">{name}</div></div>
              </button>
              {profileMenu ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <div className="text-xs font-black text-slate-900">{name}</div>
                    <div className="mt-1 text-[10px] font-semibold text-slate-500">{cleanDisplayText(data.profile?.student_code || "Student ID pending")}</div>
                  </div>
                  <Link href="/dashboard?view=profile" onClick={() => setProfileMenu(false)} className="mt-1 flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black text-slate-700 hover:bg-blue-50 hover:text-[#174699]"><UserRound className="h-4 w-4" /> My Profile</Link>
                  <Link href="/" className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black text-slate-700 hover:bg-blue-50 hover:text-[#174699]"><Globe2 className="h-4 w-4" /> Go to Website</Link>
                  <button onClick={() => void signOut()} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-xs font-black text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Sign Out</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-86px)]">
        <div className="hidden shrink-0 lg:block"><Sidebar view={view} /></div>
        <main className="min-w-0 flex-1 p-4 sm:p-6 xl:p-7">{content}</main>
      </div>

      {mobileMenu ? <div className="fixed inset-0 z-[80] lg:hidden"><button className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileMenu(false)} aria-label="Close menu overlay" /><div className="absolute inset-y-0 left-0"><div className="absolute right-2 top-2 z-10"><button onClick={() => setMobileMenu(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button></div><Sidebar view={view} mobile onNavigate={() => setMobileMenu(false)} /></div></div> : null}

      {activeMaterial ? <StudentMaterialViewer material={activeMaterial} onClose={() => setActiveMaterial(null)} onComplete={() => { void updateMaterialProgress(activeMaterial.id, "complete"); setActiveMaterial((current) => current ? { ...current, progress: { ...(current.progress || {}), completed: true, progress_percent: 100 } } : null); }} /> : null}
    </div>
  );
}

function DashboardHome({ data, name, onOpen, onBookmark }: { data: PortalData; name: string; onOpen: (m: AnyRow) => void; onBookmark: (m: AnyRow) => void }) {
  return <div className="mx-auto max-w-[1500px]">
    <div className="mb-5"><h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">Welcome back, {name}!</h1><p className="mt-1 text-sm font-medium text-slate-500">Keep learning, stay consistent and follow the courses assigned to your Student ID.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={BookOpen} label="Enrolled Courses" value={data.stats.enrolledCourses} href="/dashboard?view=courses" tone="blue" /><StatCard icon={Radio} label="Live Classes" value={data.stats.liveClasses} href="/dashboard?view=live" tone="green" /><StatCard icon={FileText} label="Study Materials" value={data.stats.studyMaterials} href="/dashboard?view=materials" tone="violet" /><StatCard icon={TrendingUp} label="Study Streak" value={`${data.stats.studyStreak} Day${data.stats.studyStreak === 1 ? "" : "s"}`} href="/dashboard?view=progress" tone="orange" /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(330px,.8fr)]"><div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-1 flex items-center justify-between"><h2 className="font-black text-slate-950">My Courses</h2><Link href="/dashboard?view=courses" className="text-[11px] font-black text-[#174699]">View all â†’</Link></div>{data.courses.slice(0,3).map((c) => <CourseRow key={c.id} course={c} />)}{!data.courses.length ? <CourseEmptyState /> : null}</div><div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-1 flex items-center justify-between"><h2 className="font-black text-slate-950">Upcoming Live Classes</h2><Link href="/dashboard?view=live" className="text-[11px] font-black text-[#174699]">View all â†’</Link></div>{data.liveClasses.slice(0,4).map((c) => <LiveClassRow key={c.id} item={c} />)}{!data.liveClasses.length ? <Empty text="No assigned live classes yet." /> : null}</div></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(330px,.8fr)]"><div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-slate-950">Continue Learning</h2><p className="mt-1 text-[11px] font-medium text-slate-500">PDFs, videos, audio and documents made available by the admin.</p></div><Link href="/dashboard?view=materials" className="text-[11px] font-black text-[#174699]">View all materials â†’</Link></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.materials.filter((m) => !m.locked).slice(0,4).map((m) => <MaterialCard key={m.id} material={m} onOpen={() => onOpen(m)} onBookmark={() => onBookmark(m)} />)}</div>{!data.materials.filter((m) => !m.locked).length ? <Empty text="No accessible study material yet." /> : null}</div><div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-2 flex items-center justify-between"><h2 className="font-black text-slate-950">Announcements</h2><Link href="/dashboard?view=announcements" className="text-[11px] font-black text-[#174699]">View all â†’</Link></div><AnnouncementList items={data.announcements.slice(0,4)} /></div></div>
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{[["Study Materials","materials",LibraryBig],["Mock Tests","mock",ClipboardCheck],["Downloads","downloads",Download],["Bookmarks","bookmarks",Bookmark],["My Progress","progress",TrendingUp]].map(([label,key,Icon]: any) => <Link key={key} href={`/dashboard?view=${key}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl text-xs font-black text-[#14256f] transition hover:bg-blue-50"><Icon className="h-4 w-4" />{label}</Link>)}</div></div>
  </div>;
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1500px]"><div className="mb-5"><h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">{title}</h1><p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p></div>{children}</div>;
}

function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-sm font-semibold text-slate-500">{text}</div>; }
function MiniSummary({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-2 text-3xl font-black text-[#14256f]">{value}</div></div>; }
function AnnouncementList({ items }: { items: AnyRow[] }) { return <div className="space-y-1">{items.length ? items.map((item) => <div key={item.id} className="flex gap-3 border-b border-slate-100 py-3 last:border-b-0"><div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-[#174699]"><Bell className="h-4 w-4" /></div><div><div className="text-xs font-black leading-snug text-slate-800">{cleanDisplayText(item.title)}</div><div className="mt-1 text-[10px] font-semibold text-slate-400">{item.date ? new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}</div></div></div>) : <Empty text="No announcements yet." />}</div>; }
function ProfileField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</dt><dd className="mt-2 break-words text-sm font-black text-slate-800">{cleanDisplayText(value)}</dd></div>;
}
function CourseEmptyState() {
  return <div className="my-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-5 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-[#174699] shadow-sm"><BookOpen className="h-5 w-5" /></div><div className="mt-3 text-sm font-black text-slate-800">No course package assigned yet</div><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">Your paid or manually assigned courses will appear here. Use the main website only when you want to browse additional courses or free resources.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#14256f] px-4 text-xs font-black text-white"><Globe2 className="h-4 w-4" /> Browse Website</Link><a href={`mailto:${SITE_CONTACT.helpdeskEmail}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700"><Mail className="h-4 w-4" /> Help Desk</a></div></div>;
}

function ContactCard({ icon: Icon, label, value, href, external = false }: any) { return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-lg"><Icon className="h-6 w-6 text-[#174699]" /><div className="mt-4 text-sm font-black text-slate-950">{label}</div><div className="mt-1 break-all text-xs font-semibold text-slate-500">{value}</div></a>; }

