"use client";

import * as React from "react";
import { AssetActivityReport } from "@/components/admin/asset-activity-report";
import { ErpFinancePanel } from "@/components/admin/erp-finance-panel";
import { createClient } from "@/lib/supabase/client";

type Role = "student" | "instructor" | "admin" | "director" | "owner";
type Session = { identity: string; role: Role; logged_in_at: string; last_seen_at: string; logged_out_at: string | null; active_seconds: number; country_code: string | null; region_code: string | null };
type Event = { role: Role; kind: string; target_id: string | null; duration_seconds: number; created_at: string };
type Student = { id: string; full_name: string | null; email: string | null; created_at: string };
type Upload = { action: string; details: { title?: string } | null; created_at: string; teacher_id: string };
type Report = { viewer: "director" | "owner"; sessions: Session[]; studentRegions: [string, number][]; studentLoginsToday: number; uniqueStudentsToday: number; studentSignupsToday: number; recentStudents: Student[]; events: Event[]; teacherUploads: Upload[]; teacherNames: Record<string, string>; sales: { amount_paise: number }[]; students: number; classes: number; settings: { admin_idle_minutes: number; teacher_idle_minutes: number } };
type Tab = "students" | "teachers" | "admins" | "directors" | "owner";

const colors: Record<Tab, string> = {
  students: "border-sky-300 bg-sky-50 text-sky-800",
  teachers: "border-emerald-300 bg-emerald-50 text-emerald-800",
  admins: "border-amber-300 bg-amber-50 text-amber-800",
  directors: "border-violet-300 bg-violet-50 text-violet-800",
  owner: "border-rose-300 bg-rose-50 text-rose-800",
};
const roleForTab: Record<Tab, Role> = { students: "student", teachers: "instructor", admins: "admin", directors: "director", owner: "owner" };
const stamp = (value: string) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

function courseInterest(events: Event[]) {
  const rows = new Map<string, { views: number; minutes: number }>();
  for (const event of events) {
    if (event.kind !== "content_view" || !event.target_id) continue;
    const row = rows.get(event.target_id) || { views: 0, minutes: 0 };
    row.views += 1;
    row.minutes += event.duration_seconds / 60;
    rows.set(event.target_id, row);
  }
  return [...rows.entries()].sort((a, b) => b[1].views - a[1].views).slice(0, 10);
}

export function DirectorDashboard({ scope = "director" }: { scope?: "director" | "owner" }) {
  const [data, setData] = React.useState<Report | null>(null);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("students");
  const [sectionView, setSectionView] = React.useState<"activity" | "erp">("activity");
  const [admin, setAdmin] = React.useState(10);
  const [teacher, setTeacher] = React.useState(10);
  const [updated, setUpdated] = React.useState<Date | null>(null);

  const load = React.useCallback(async () => {
    try {
      const response = await fetch(scope === "owner" ? "/api/director/report?scope=owner" : "/api/director/report", { cache: "no-store" });
      const report = await response.json();
      if (!response.ok) throw new Error(report.error || "Unable to load report");
      setData(report);
      setAdmin(report.settings?.admin_idle_minutes || 10);
      setTeacher(report.settings?.teacher_idle_minutes || 10);
      setUpdated(new Date());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load report");
    }
  }, [scope]);

  React.useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(refresh);
  }, [load]);

  async function save() {
    const response = await fetch("/api/director/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ admin_idle_minutes: admin, teacher_idle_minutes: teacher }) });
    setError(response.ok ? "Session settings saved." : "Unable to save session settings.");
  }

  const tabs: Tab[] = scope === "owner" ? ["students", "teachers", "admins", "directors", "owner"] : ["students", "teachers", "admins"];
  const sessions = (data?.sessions || []).filter((session) => session.role === roleForTab[tab]);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const sessionsToday = sessions.filter((session) => new Date(session.logged_in_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === today).length;
  const sales = (data?.sales || []).reduce((sum, row) => sum + row.amount_paise, 0);
  const interest = courseInterest(data?.events || []);

  async function signOut() {
    await fetch("/api/activity/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => undefined);
    const client = createClient();
    if (client) await client.auth.signOut().catch(() => undefined);
    window.location.assign("/staff/login");
  }

  return <main className="min-h-screen bg-[#faf8f4] p-4 text-slate-900 sm:p-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-widest text-blue-700">{scope === "owner" ? "Private Super Admin view" : "Private director view"}</p><h1 className="mt-2 text-3xl font-black">{scope === "owner" ? "Platform Activity" : "Director Dashboard"}</h1><p className="mt-1 text-sm text-slate-500">Activity, teaching, enrolments, ERP expenses, tax &amp; payments.</p></div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <div className="inline-flex rounded-xl border bg-white p-1">
            <button type="button" onClick={() => setSectionView("activity")} className={`rounded-lg px-3 py-1.5 font-bold ${sectionView === "activity" ? "bg-[#14256f] text-white" : "text-slate-600"}`}>Activity &amp; Controls</button>
            <button type="button" onClick={() => setSectionView("erp")} className={`rounded-lg px-3 py-1.5 font-bold ${sectionView === "erp" ? "bg-[#c37a26] text-white" : "text-slate-600"}`}>ERP, Expenses &amp; Tax</button>
          </div>
          <span>{updated ? `Updated ${updated.toLocaleTimeString("en-IN")}` : "Loading…"}</span>
          <button onClick={() => void load()} className="rounded-lg border bg-white px-3 py-2 font-bold text-blue-800">Refresh now</button>
          {scope === "director" && <button onClick={() => void signOut()} className="rounded-lg border bg-white px-3 py-2 font-bold text-slate-700">Sign out</button>}
        </div>
      </header>
      {sectionView === "erp" ? (
        <ErpFinancePanel />
      ) : (
        <>
      {error && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[["Total students", data?.students ?? "—"], ["New students today", data?.studentSignupsToday ?? "—"], ["Student sign-ins today", data?.studentLoginsToday ?? "—"], ["Course sales today", `₹${(sales / 100).toLocaleString("en-IN")}`], ["Classes today", data?.classes ?? "—"]].map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><b className="mt-2 block text-2xl">{value}</b></div>)}
      </div>
      <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Activity by account</h2><p className="mt-1 text-sm text-slate-500">Choose a group to see its sign-ins and active time. Student sign-ins count sessions, including repeat visits.</p>
        <div role="tablist" aria-label="Account activity" className="mt-4 flex flex-wrap gap-2">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`rounded-lg border px-4 py-2 text-sm font-bold capitalize ${colors[item]} ${tab === item ? "ring-2 ring-offset-2 ring-slate-500" : "opacity-75"}`}>{item === "teachers" ? "Teachers" : item === "admins" ? "Admins" : item === "directors" ? "Directors" : item === "owner" ? "Super Admin" : "Students"} <span className="ml-1 rounded-full bg-white/70 px-2 py-0.5">{(data?.sessions || []).filter((session) => session.role === roleForTab[item]).length}</span></button>)}</div>
        <p className="mt-5 text-sm font-semibold text-slate-700">{sessionsToday} {tab === "owner" ? "super admin" : tab} sign-ins today · {sessions.length} recent session records</p>
        {tab === "students" && <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4"><h3 className="font-bold text-sky-900">Recently enrolled students</h3><p className="mb-3 text-xs text-sky-700">New accounts appear here even before their first sign-in.</p><div className="max-h-72 overflow-auto">{data?.recentStudents.length ? data.recentStudents.map((student) => <div key={student.id} className="flex flex-wrap justify-between gap-2 border-t border-sky-200 py-2 text-sm"><span><b>{student.full_name || "Unnamed student"}</b><small className="block text-slate-600">{student.email || "No email"}</small></span><span className="text-slate-500">{stamp(student.created_at)}</span></div>) : <p className="text-sm">No student records yet.</p>}</div></div>
          <div className="rounded-lg border p-4"><h3 className="font-bold">Student sign-ins by region</h3><p className="mt-1 text-xs text-slate-500">{data?.uniqueStudentsToday || 0} distinct students today. Local preview may show “Unknown” because it has no Vercel location headers.</p><div className="mt-3 flex flex-wrap gap-2">{data?.studentRegions.length ? data.studentRegions.map(([region, count]) => <span key={region} className="rounded-lg bg-sky-50 px-3 py-2 text-sm">{region}: <b>{count}</b></span>) : <p className="text-sm text-slate-500">No student sign-ins recorded today.</p>}</div></div>
        </div>}
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr>{["Name", "Signed in", "Last active", "Signed out", "Active time", "Region / country"].map((heading) => <th key={heading} className="border-b pb-2 pr-3">{heading}</th>)}</tr></thead><tbody>{sessions.map((session, index) => <tr className="border-b last:border-0" key={`${session.identity}-${session.logged_in_at}-${index}`}><td className="py-3 pr-3 font-semibold">{session.identity}</td><td className="pr-3">{stamp(session.logged_in_at)}</td><td className="pr-3">{stamp(session.last_seen_at)}</td><td className="pr-3">{session.logged_out_at ? stamp(session.logged_out_at) : "—"}</td><td className="pr-3">{Math.round(session.active_seconds / 60)} min</td><td>{[session.region_code, session.country_code].filter(Boolean).join(" / ") || "Unknown"}</td></tr>)}</tbody></table>{!sessions.length && <p className="py-5 text-sm text-slate-500">No {tab === "owner" ? "super admin" : tab} sign-ins recorded yet.</p>}</div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Most-read content</h2><p className="mt-1 text-xs text-slate-500">Estimated from visible reading intervals while a signed-in student is active.</p>{interest.length ? interest.map(([path, stats]) => <div key={path} className="flex justify-between gap-4 border-b py-2 text-sm"><span>{path}</span><span>{stats.views} intervals · {Math.round(stats.minutes)} min</span></div>) : <p className="mt-4 text-sm text-slate-500">No reading activity recorded yet.</p>}</section>
        <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Teacher uploads</h2>{data?.teacherUploads.length ? data.teacherUploads.slice(0, 20).map((upload, index) => <div key={index} className="border-b py-2 text-sm"><b>{upload.details?.title || upload.action}</b><small className="block text-slate-500">{data.teacherNames?.[upload.teacher_id] || "Teacher"} · {stamp(upload.created_at)}</small></div>) : <p className="mt-4 text-sm text-slate-500">No teacher uploads recorded yet.</p>}</section></div>
      <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Idle sign-out settings</h2><p className="mt-1 text-sm text-slate-500">Staff will be asked to sign in again after inactivity.</p><div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Admin idle minutes<input type="number" min="5" max="120" value={admin} onChange={(event) => setAdmin(Number(event.target.value))} className="mt-2 block w-full rounded-lg border p-3" /></label><label className="text-sm font-bold">Teacher idle minutes<input type="number" min="5" max="120" value={teacher} onChange={(event) => setTeacher(Number(event.target.value))} className="mt-2 block w-full rounded-lg border p-3" /></label></div><button onClick={() => void save()} className="mt-4 rounded-lg bg-[#202b70] px-5 py-2 font-bold text-white">Save settings</button></section>
      <AssetActivityReport />
        </>
      )}
    </div>
  </main>;
}
