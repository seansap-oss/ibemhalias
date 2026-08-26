"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bell, BookOpen, CalendarDays, CheckCircle2, Copy, DoorOpen, Download, ExternalLink, FileText, Loader2, MessageCircle, Package, Plus, Radio, RefreshCw, Save, Search, Send, ShieldCheck, Trash2, Upload, Users } from "lucide-react";
import type { LiveAdminView } from "@/lib/live-class/types";

type AnyRow = Record<string, any>;

async function getAdmin(view: string, extra = "") {
  const response = await fetch(`/api/live-class/admin?view=${encodeURIComponent(view)}${extra}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function postAdmin(action: string, body: AnyRow = {}) {
  const response = await fetch("/api/live-class/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || data?.result?.error || `HTTP ${response.status}`);
  return data;
}

function useLiveData(view: string, extra = "") {
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await getAdmin(view, extra)); } catch (e: any) { setError(e.message || "Unable to load data."); }
    finally { setLoading(false); }
  }, [view, extra]);
  React.useEffect(() => { load(); }, [load]);
  return { data, error, loading, load };
}

function Status({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  const cls: AnyRow = { green: "bg-green-50 text-green-700", red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700", slate: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${cls[tone] || cls.slate}`}>{children}</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">{text}</div>; }

function ErrorBox({ message }: { message: string }) { return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</div>; }

function Loading() { return <div className="flex items-center gap-2 rounded-2xl bg-white p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>; }

export function LiveAdminConsole({ view }: { view: LiveAdminView }) {
  if (view === "overview") return <Overview />;
  if (view === "schedule") return <Schedule />;
  if (view === "students") return <Students />;
  if (view === "classrooms") return <Classrooms />;
  if (view === "reminders") return <Reminders />;
  if (view === "attendance") return <Attendance />;
  return <Packages />;
}

function Overview() {
  const { data, error, loading, load } = useLiveData("overview");
  if (loading) return <Loading />; if (error) return <ErrorBox message={error} />;
  const stats = data.stats || {};
  const cards = [
    ["Live Classes", stats.totalClasses || 0, CalendarDays],
    ["Total Students", stats.totalStudents || 0, Users],
    ["Live Now", stats.liveNow || 0, Radio],
    ["Reminder Success", `${stats.reminderSuccess ?? 100}%`, Bell],
  ];
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]: any) => <Card key={label}><Icon className="h-5 w-5 text-[#14256f]" /><div className="mt-4 text-3xl font-black text-slate-900">{value}</div><div className="text-xs font-semibold text-slate-400">{label}</div></Card>)}</div>
    <Card>
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-slate-900">Class Schedule + Enrollment</h2><p className="text-xs text-slate-500">Assignments follow purchased package access and manual overrides.</p></div><button onClick={load} className="rounded-xl border p-2"><RefreshCw className="h-4 w-4" /></button></div>
      <div className="grid gap-3 xl:grid-cols-5">{(data.classes || []).map((c: AnyRow, i: number) => <div key={c.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14256f] text-xs font-black text-white">{i + 1}</span><Status tone={c.status === "live" ? "green" : c.status === "cancelled" ? "red" : "slate"}>{c.status}</Status></div><h3 className="mt-3 text-sm font-black">{c.title}</h3><p className="text-xs text-slate-500">{c.topic}</p><div className="mt-4 text-xs"><div><b>{c.assigned_count || 0}</b> students</div><div className="mt-1 text-slate-500">{c.room_name || "Room not assigned"}</div></div><Link href={`/admin/live-classes/classes/${c.id}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#14256f] px-3 py-2 text-xs font-black text-white">Manage</Link></div>)}</div>
      {!data.classes?.length && <Empty text="No live classes scheduled yet." />}
    </Card>
  </div>;
}

function Schedule() {
  const { data, error, loading, load } = useLiveData("schedule");
  const [busy, setBusy] = React.useState(false); const [message, setMessage] = React.useState("");
  const [form, setForm] = React.useState<any>({ title: "", topic: "", facultyName: "", startsAt: "", endsAt: "", capacity: 500, roomId: "", courseIds: [] });
  if (loading) return <Loading />; if (error) return <ErrorBox message={error} />;
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setMessage(""); try { await postAdmin("create_class", form); setMessage("Class scheduled and eligible students assigned."); setForm({ title: "", topic: "", facultyName: "", startsAt: "", endsAt: "", capacity: 500, roomId: "", courseIds: [] }); await load(); } catch (e: any) { setMessage(e.message); } finally { setBusy(false); } };
  return <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
    <Card><h2 className="text-lg font-black">Schedule Live Class</h2><form onSubmit={submit} className="mt-4 space-y-3"><Input label="Class title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} /><Input label="Topic" value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} /><Input label="Faculty" value={form.facultyName} onChange={(v) => setForm({ ...form, facultyName: v })} /><div className="grid grid-cols-2 gap-3"><Input type="datetime-local" label="Starts" value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} /><Input type="datetime-local" label="Ends" value={form.endsAt} onChange={(v) => setForm({ ...form, endsAt: v })} /></div><Input type="number" label="Capacity" value={String(form.capacity)} onChange={(v) => setForm({ ...form, capacity: Number(v) })} />
      <label className="block text-xs font-bold text-slate-500">Room<select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Auto assign later</option>{(data.rooms || []).map((r: AnyRow) => <option key={r.id} value={r.id}>{r.name} · {r.capacity}</option>)}</select></label>
      <div><div className="text-xs font-bold text-slate-500">Packages that grant access</div><div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-xl border p-3">{(data.courses || []).map((c: AnyRow) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.courseIds.includes(c.id)} onChange={(e) => setForm({ ...form, courseIds: e.target.checked ? [...form.courseIds, c.id] : form.courseIds.filter((x: string) => x !== c.id) })} /> {c.title}</label>)}</div></div>
      {message && <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold">{message}</div>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14256f] px-4 py-3 text-sm font-black text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Class</button></form></Card>
    <Card><h2 className="text-lg font-black">Scheduled Classes</h2><div className="mt-4 space-y-3">{(data.classes || []).map((c: AnyRow) => <div key={c.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="font-black">{c.title} — {c.topic}</div><div className="text-xs text-slate-500">{new Date(c.starts_at).toLocaleString()} · {c.assigned_count || 0} students</div></div><Status tone={c.status === "live" ? "green" : "slate"}>{c.status}</Status><Link href={`/admin/live-classes/classes/${c.id}`} className="rounded-xl bg-[#14256f] px-3 py-2 text-center text-xs font-black text-white">Manage</Link></div>)}</div></Card>
  </div>;
}

function Students() {
  const { data, error, loading, load } = useLiveData("students");
  const [search, setSearch] = React.useState(""); const [showAdd, setShowAdd] = React.useState(false); const [busy, setBusy] = React.useState(false); const [result, setResult] = React.useState<any>(null);
  const [form, setForm] = React.useState<any>({ fullName: "", email: "", phone: "", courseIds: [], whatsappOptIn: true });
  if (loading) return <Loading />; if (error) return <ErrorBox message={error} />;
  const filtered = (data.students || []).filter((s: AnyRow) => `${s.student_code} ${s.full_name} ${s.email} ${s.phone}`.toLowerCase().includes(search.toLowerCase()));
  const add = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setResult(null); try { const r = await postAdmin("create_student", form); setResult(r); setForm({ fullName: "", email: "", phone: "", courseIds: [], whatsappOptIn: true }); await load(); } catch (e: any) { setResult({ error: e.message }); } finally { setBusy(false); } };
  return <div className="space-y-5"><Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black">Student Access Control</h2><p className="text-xs text-slate-500">One permanent Student ID can hold any number of packages and classes.</p></div><button onClick={() => setShowAdd(!showAdd)} className="rounded-xl bg-[#14256f] px-4 py-2 text-xs font-black text-white">+ Add Student</button></div>
    {showAdd && <form onSubmit={add} className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3"><Input label="Full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} /><Input label="Email / username" value={form.email} onChange={(v) => setForm({ ...form, email: v })} /><Input label="WhatsApp phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /><div className="md:col-span-3"><div className="text-xs font-bold text-slate-500">Purchased packages</div><div className="mt-2 flex flex-wrap gap-2">{(data.courses || []).map((c: AnyRow) => <label key={c.id} className="rounded-full border bg-white px-3 py-2 text-xs font-bold"><input className="mr-2" type="checkbox" checked={form.courseIds.includes(c.id)} onChange={(e) => setForm({ ...form, courseIds: e.target.checked ? [...form.courseIds, c.id] : form.courseIds.filter((x: string) => x !== c.id) })} />{c.title}</label>)}</div></div><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.whatsappOptIn} onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })} /> WhatsApp reminders</label><button disabled={busy} className="rounded-xl bg-green-600 px-4 py-2 text-xs font-black text-white md:col-start-3">Create Student</button></form>}
    {result && <div className={`mt-3 rounded-xl p-3 text-xs ${result.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{result.error || <>Student created. ID <b>{result.student?.student_code}</b>. Temporary password: <b>{result.temporaryPassword}</b></>}</div>}
  </Card>
  <Card><div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Student ID, name, email or phone" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" /></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[#14256f] text-white"><tr><Th>Student ID</Th><Th>Name</Th><Th>Phone</Th><Th>Package</Th><Th>Classes</Th><Th>WhatsApp</Th><Th>Action</Th></tr></thead><tbody>{filtered.map((s: AnyRow) => <tr key={s.id} className="border-b"><Td><b>{s.student_code || s.id.slice(0,8)}</b></Td><Td><div className="font-bold">{s.full_name}</div><div className="text-slate-400">{s.email}</div></Td><Td>{s.phone || "—"}</Td><Td>{s.package_names?.length ? s.package_names.join(", ") : "None"}</Td><Td><b>{s.assigned_count}</b></Td><Td><Status tone={s.whatsapp_opt_in === false ? "red" : "green"}>{s.whatsapp_opt_in === false ? "Off" : "On"}</Status></Td><Td><Link href={`/admin/live-classes/students/${s.id}`} className="font-black text-[#14256f]">View</Link></Td></tr>)}</tbody></table></div></Card></div>;
}

function Classrooms() {
  const { data, error, loading, load } = useLiveData("classrooms"); const [name, setName] = React.useState(""); const [capacity, setCapacity] = React.useState("10"); const [message, setMessage] = React.useState(""); const [busy, setBusy] = React.useState(false);
  if (loading) return <Loading />; if (error) return <ErrorBox message={error} />;
  const create = async () => { setBusy(true); try { await postAdmin("create_room", { name, capacity: Number(capacity) }); setName(""); setMessage("Room created."); await load(); } catch(e:any){setMessage(e.message)} finally{setBusy(false)} };
  const auto = async () => { setBusy(true); try { const r = await postAdmin("auto_assign_rooms"); setMessage(`Auto-assigned ${r.allocations?.length || 0} classes.`); await load(); } catch(e:any){setMessage(e.message)} finally{setBusy(false)} };
  const classesByRoom = new Map<string, AnyRow[]>(); for(const c of data.classes || []) { const a=classesByRoom.get(c.room_id)||[]; a.push(c); classesByRoom.set(c.room_id,a); }
  return <div className="space-y-5"><Card><div className="flex flex-col gap-3 lg:flex-row lg:items-end"><div className="flex-1"><Input label="New room name" value={name} onChange={setName} /></div><div className="w-full lg:w-40"><Input type="number" label="Capacity" value={capacity} onChange={setCapacity} /></div><button onClick={create} disabled={busy} className="rounded-xl bg-[#14256f] px-4 py-3 text-xs font-black text-white">Add Room</button><button onClick={auto} disabled={busy} className="rounded-xl bg-green-600 px-4 py-3 text-xs font-black text-white">Auto Assign by Capacity</button></div>{message && <div className="mt-3 text-xs font-semibold">{message}</div>}</Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(data.rooms || []).map((r: AnyRow) => { const cls=classesByRoom.get(r.id)||[]; const max=Math.max(0,...cls.map((c)=>c.assigned_count||0)); const pct=Math.min(100,Math.round(max/r.capacity*100)); return <Card key={r.id}><div className="flex items-center justify-between"><DoorOpen className="h-5 w-5 text-[#14256f]" /><b>{max} / {r.capacity}</b></div><h3 className="mt-3 font-black">{r.name}</h3><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#14256f]" style={{width:`${pct}%`}} /></div><div className="mt-4 space-y-2 text-xs">{cls.map((c)=> <Link key={c.id} href={`/admin/live-classes/classes/${c.id}`} className="block rounded-xl bg-slate-50 p-2 font-bold">{c.title} · {c.assigned_count || 0}</Link>)}{!cls.length && <span className="text-slate-400">No class assigned.</span>}</div></Card>})}</div></div>;
}

function Reminders() {
  const { data, error, loading, load } = useLiveData("reminders"); const [message,setMessage]=React.useState(""); const [phone,setPhone]=React.useState(""); const [saving,setSaving]=React.useState(false);
  if (loading) return <Loading />; if (error) return <ErrorBox message={error} />;
  const saveRule = async (r: AnyRow, patch: AnyRow) => { setSaving(true); try { await postAdmin("save_reminder_rule", { ruleId:r.id, enabled: patch.enabled ?? r.enabled, messageTemplate: patch.message_template ?? r.message_template, whatsappTemplateName: patch.whatsapp_template_name ?? r.whatsapp_template_name }); setMessage("Reminder rule saved."); await load(); } catch(e:any){setMessage(e.message)} finally{setSaving(false)} };
  const enableAutomation=async()=>{setSaving(true);try{await postAdmin("save_automation",{baseUrl:window.location.origin,enabled:true});setMessage("Automation enabled. Supabase will call the reminder processor every 5 minutes after migration 006 is applied.");await load()}catch(e:any){setMessage(e.message)}finally{setSaving(false)}};
  const test=async()=>{setSaving(true);try{await postAdmin("send_test",{phone});setMessage("WhatsApp test sent.")}catch(e:any){setMessage(e.message)}finally{setSaving(false)}};
  return <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card><h2 className="text-lg font-black">Reminder Automation</h2><div className="mt-4 space-y-3">{(data.rules || []).map((r:AnyRow)=><div key={r.id} className="rounded-2xl border p-4"><div className="flex items-center justify-between"><div><div className="font-black capitalize">{String(r.rule_type).replaceAll("_"," ")}</div><div className="text-xs text-slate-400">{r.offset_minutes ? `${r.offset_minutes} minutes before` : "Immediate / event based"}</div></div><button onClick={()=>saveRule(r,{enabled:!r.enabled})} className={`relative h-7 w-12 rounded-full ${r.enabled?"bg-[#14256f]":"bg-slate-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${r.enabled?"left-6":"left-1"}`} /></button></div><input defaultValue={r.whatsapp_template_name || ""} onBlur={(e)=>saveRule(r,{whatsapp_template_name:e.target.value})} className="mt-3 w-full rounded-xl border px-3 py-2 text-xs" placeholder="Approved Meta template name" /><textarea defaultValue={r.message_template || ""} onBlur={(e)=>saveRule(r,{message_template:e.target.value})} className="mt-2 min-h-20 w-full rounded-xl border p-3 text-xs" /></div>)}</div></Card>
    <div className="space-y-5"><Card><h2 className="font-black">Automation Engine</h2><p className="mt-2 text-xs leading-5 text-slate-500">Uses Supabase Cron, not Vercel Hobby Cron, so 1-day, 1-hour and 10-minute reminders can run automatically.</p><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs"><div>Base URL: <b>{data.settings?.automation_base_url || "Not configured"}</b></div><div className="mt-1">Enabled: <b>{data.settings?.automation_enabled || "false"}</b></div><div className="mt-1">WhatsApp API: <b>{data.whatsapp?.configured ? "Configured" : "Needs Meta credentials"}</b></div></div><button disabled={saving} onClick={enableAutomation} className="mt-3 w-full rounded-xl bg-[#14256f] px-4 py-3 text-xs font-black text-white">Enable / Refresh Automation</button></Card>
    <Card><h2 className="font-black">Send WhatsApp Test</h2><input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="9876543210" className="mt-3 w-full rounded-xl border px-3 py-2.5 text-sm" /><button disabled={saving} onClick={test} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-xs font-black text-white"><Send className="h-4 w-4"/>Send Test</button>{message&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold">{message}</div>}</Card>
    <Card><h2 className="font-black">Recent Reminder Queue</h2><div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{(data.notifications || []).slice(0,20).map((n:AnyRow)=><div key={n.id} className="rounded-xl border p-3 text-xs"><div className="flex justify-between"><b>{n.rule_type}</b><Status tone={n.status==="sent"?"green":n.status==="failed"?"red":n.status==="pending"?"amber":"slate"}>{n.status}</Status></div><div className="mt-1 text-slate-400">{new Date(n.scheduled_for).toLocaleString()}</div>{n.last_error&&<div className="mt-1 text-red-600">{n.last_error}</div>}</div>)}</div></Card></div></div>;
}

function Attendance() {
  const {data,error,loading}=useLiveData("attendance"); if(loading)return<Loading/>;if(error)return<ErrorBox message={error}/>;
  const sm=new Map((data.students||[]).map((x:AnyRow)=>[x.id,x])); const cm=new Map((data.classes||[]).map((x:AnyRow)=>[x.id,x]));
  const exportCsv=()=>{const lines=[["Student ID","Name","Class","First Join","Last Leave","Watch Minutes","Status"],...(data.attendance||[]).map((a:AnyRow)=>{const s:any=sm.get(a.student_id)||{};const c:any=cm.get(a.live_class_id)||{};return[s.student_code||a.student_id,s.full_name||"",`${c.title||""} ${c.topic||""}`,a.first_join_at||"",a.last_leave_at||"",Math.round((a.watch_seconds||0)/60),a.status]})];const csv=lines.map((r:any[])=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ibemhal-live-attendance.csv";a.click();URL.revokeObjectURL(url)};
  return <Card><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Attendance</h2><p className="text-xs text-slate-500">Join/leave and watch-time records.</p></div><button onClick={exportCsv} className="flex items-center gap-2 rounded-xl bg-[#14256f] px-4 py-2 text-xs font-black text-white"><Download className="h-4 w-4"/>Export CSV</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[#14256f] text-white"><tr><Th>Student</Th><Th>Class</Th><Th>First Join</Th><Th>Last Leave</Th><Th>Watch</Th><Th>Status</Th></tr></thead><tbody>{(data.attendance||[]).map((a:AnyRow)=>{const s:any=sm.get(a.student_id)||{};const c:any=cm.get(a.live_class_id)||{};return<tr key={a.id} className="border-b"><Td><b>{s.student_code||"—"}</b><div>{s.full_name}</div></Td><Td>{c.title} — {c.topic}</Td><Td>{a.first_join_at?new Date(a.first_join_at).toLocaleString():"—"}</Td><Td>{a.last_leave_at?new Date(a.last_leave_at).toLocaleString():"—"}</Td><Td>{Math.round((a.watch_seconds||0)/60)} min</Td><Td><Status tone="green">{a.status}</Status></Td></tr>})}</tbody></table></div></Card>;
}

function Packages() {
  const {data,error,loading,load}=useLiveData("packages");const[message,setMessage]=React.useState("");if(loading)return<Loading/>;if(error)return<ErrorBox message={error}/>;
  const mapFor=(courseId:string)=>(data.mappings||[]).filter((m:AnyRow)=>m.course_id===courseId).map((m:AnyRow)=>m.live_class_id);
  return <div className="space-y-4"><Card><h2 className="text-lg font-black">Packages → Live Class Access</h2><p className="mt-1 text-xs text-slate-500">When a student purchases a course/package, every mapped live class is assigned automatically.</p>{message&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold">{message}</div>}</Card>{(data.courses||[]).map((course:AnyRow)=><PackageMapper key={course.id} course={course} classes={data.classes||[]} selected={mapFor(course.id)} onSave={async(ids)=>{try{await postAdmin("map_package_classes",{courseId:course.id,classIds:ids});setMessage(`${course.title} mapping saved and assignments synced.`);await load()}catch(e:any){setMessage(e.message)}}}/>)}</div>;
}

function PackageMapper({course,classes,selected,onSave}:{course:AnyRow;classes:AnyRow[];selected:string[];onSave:(ids:string[])=>Promise<void>}){const[ids,setIds]=React.useState(selected);React.useEffect(()=>setIds(selected),[selected.join("|")]);return<Card><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><Package className="h-4 w-4 text-[#14256f]"/><h3 className="font-black">{course.title}</h3></div><p className="text-xs text-slate-400">{course.enrolled_count||0} paid students · {ids.length} live classes</p></div><button onClick={()=>onSave(ids)} className="rounded-xl bg-[#14256f] px-4 py-2 text-xs font-black text-white"><Save className="mr-1 inline h-3.5 w-3.5"/>Save Mapping</button></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{classes.map(c=><label key={c.id} className={`rounded-xl border p-3 text-xs ${ids.includes(c.id)?"border-[#14256f] bg-[#14256f]/5":"border-slate-200"}`}><input type="checkbox" checked={ids.includes(c.id)} onChange={(e)=>setIds(e.target.checked?[...ids,c.id]:ids.filter(x=>x!==c.id))} className="mr-2"/><b>{c.title}</b><div className="ml-5 text-slate-400">{c.topic}</div></label>)}</div></Card>}

export function LiveStudentDetail() {
  const params=useParams(); const studentId=String(params.studentId||""); const {data,error,loading,load}=useLiveData("student",`&studentId=${encodeURIComponent(studentId)}`); const[message,setMessage]=React.useState("");const[selected,setSelected]=React.useState<string[]>([]);
  if(loading)return<Loading/>;if(error)return<ErrorBox message={error}/>;const s=data.student;const active=new Set((data.assignments||[]).filter((a:AnyRow)=>a.status==="active").map((a:AnyRow)=>a.live_class_id));const enrolled=new Set((data.enrollments||[]).filter((e:AnyRow)=>e.payment_status==="paid").map((e:AnyRow)=>e.course_id));
  const run=async(fn:()=>Promise<any>,ok:string)=>{try{await fn();setMessage(ok);await load()}catch(e:any){setMessage(e.message)}};
  return <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><div className="space-y-5"><Card><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14256f] font-black text-white">{s.full_name?.[0]}</div><div><h2 className="text-lg font-black">{s.full_name}</h2><Status tone="green">Active</Status></div></div><dl className="mt-5 space-y-2 text-xs"><Row k="Student ID" v={s.student_code}/><Row k="Email" v={s.email}/><Row k="Phone" v={s.phone||"—"}/><Row k="WhatsApp" v={s.whatsapp_opt_in===false?"Off":"On"}/><Row k="Tier" v={s.tier}/></dl></Card><Card><h3 className="font-black">Purchased Packages</h3><div className="mt-3 space-y-2">{(data.courses||[]).map((c:AnyRow)=><div key={c.id} className="flex items-center justify-between rounded-xl border p-3 text-xs"><span className="font-bold">{c.title}</span>{enrolled.has(c.id)?<button onClick={()=>run(()=>postAdmin("revoke_package",{studentId,courseId:c.id}),"Package revoked and access reconciled.")} className="text-red-600">Revoke</button>:<button onClick={()=>run(()=>postAdmin("grant_package",{studentId,courseId:c.id}),"Package granted and eligible classes assigned.")} className="text-green-600">Grant</button>}</div>)}</div></Card></div>
  <div className="space-y-5"><Card><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Assigned Classes ({active.size})</h2><p className="text-xs text-slate-500">One Student ID can hold any number of classes.</p></div></div>{message&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold">{message}</div>}<div className="mt-4 grid gap-2 md:grid-cols-2">{(data.classes||[]).map((c:AnyRow)=>{const on=active.has(c.id);return<div key={c.id} className={`rounded-xl border p-3 ${on?"border-green-200 bg-green-50/50":""}`}><div className="flex justify-between gap-2"><div><b className="text-sm">{c.title}</b><div className="text-xs text-slate-400">{c.topic}</div></div>{on?<button onClick={()=>run(()=>postAdmin("revoke_class",{studentId,classId:c.id}),"Class access revoked.")} className="text-xs font-black text-red-600">Remove</button>:<label className="text-xs"><input type="checkbox" checked={selected.includes(c.id)} onChange={(e)=>setSelected(e.target.checked?[...selected,c.id]:selected.filter(x=>x!==c.id))}/> Add</label>}</div></div>})}</div><button disabled={!selected.length} onClick={()=>run(async()=>{await postAdmin("assign_classes",{studentId,classIds:selected});setSelected([])},"Selected classes assigned.")} className="mt-4 rounded-xl bg-[#14256f] px-4 py-3 text-xs font-black text-white disabled:opacity-40">Assign Selected Classes</button></Card>
  <Card><h3 className="font-black">WhatsApp / Notification History</h3><div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{(data.notifications||[]).map((n:AnyRow)=><div key={n.id} className="rounded-xl border p-3 text-xs"><div className="flex justify-between"><b>{n.rule_type}</b><Status tone={n.status==="sent"?"green":n.status==="failed"?"red":"amber"}>{n.status}</Status></div><div className="mt-1 text-slate-400">{new Date(n.scheduled_for).toLocaleString()}</div>{n.last_error&&<div className="mt-1 text-red-600">{n.last_error}</div>}</div>)}</div></Card></div></div>;
}

export function LiveClassAdminDetail() {
  const params=useParams(); const classId=String(params.classId||""); const {data,error,loading,load}=useLiveData("class",`&classId=${encodeURIComponent(classId)}`);const[msg,setMsg]=React.useState("");const[file,setFile]=React.useState<File|null>(null);const[externalUrl,setExternalUrl]=React.useState("");
  if(loading)return<Loading/>;if(error)return<ErrorBox message={error}/>;const c=data.liveClass;const studentMap=new Map((data.students||[]).map((s:AnyRow)=>[s.id,s]));
  const action=async(name:string,body:AnyRow,ok:string)=>{try{await postAdmin(name,body);setMsg(ok);await load()}catch(e:any){setMsg(e.message)}};
  const upload=async()=>{const form=new FormData();form.set("liveClassId",classId);if(file)form.set("file",file);if(externalUrl)form.set("externalUrl",externalUrl);const r=await fetch("/api/live-class/admin/upload",{method:"POST",body:form});const j=await r.json();if(!r.ok||!j.ok){setMsg(j.error||"Upload failed");return}setMsg("Resource added.");setFile(null);setExternalUrl("");await load()};
  return <div className="space-y-5"><Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><Status tone={c.status==="live"?"green":"slate"}>{c.status}</Status><span className="text-xs text-slate-400">{new Date(c.starts_at).toLocaleString()}</span></div><h2 className="mt-2 text-2xl font-black">{c.title} — {c.topic}</h2><p className="text-sm text-slate-500">{c.faculty_name}</p></div><div className="flex flex-wrap gap-2">{c.status!=="live"&&<button onClick={()=>action("update_class",{classId,status:"live"},"Class is now LIVE.")} className="rounded-xl bg-green-600 px-4 py-2 text-xs font-black text-white">Start Class</button>}<button onClick={()=>action("update_class",{classId,status:"completed"},"Class completed.")} className="rounded-xl bg-[#14256f] px-4 py-2 text-xs font-black text-white">End Class</button><Link href={`/live-classes/${classId}`} target="_blank" className="rounded-xl border px-4 py-2 text-xs font-black">Student View <ExternalLink className="ml-1 inline h-3 w-3"/></Link></div></div>{msg&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold">{msg}</div>}</Card>
  <div className="grid gap-5 xl:grid-cols-2"><Card><h3 className="font-black">Students ({(data.assignments||[]).filter((a:AnyRow)=>a.status==="active").length})</h3><div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{(data.assignments||[]).filter((a:AnyRow)=>a.status==="active").map((a:AnyRow)=>{const s:any=studentMap.get(a.student_id)||{};return<div key={a.id} className="flex items-center justify-between rounded-xl border p-3 text-xs"><div><b>{s.student_code||a.student_id.slice(0,8)} · {s.full_name||"Student"}</b><div className="text-slate-400">{s.phone||"No phone"} · {a.source}</div></div><button onClick={()=>action("send_reminder_now",{studentId:a.student_id,classId,baseUrl:window.location.origin},"Reminder sent.")} className="rounded-lg bg-green-50 px-2 py-1 font-black text-green-700">WhatsApp</button></div>})}</div></Card>
  <Card><h3 className="font-black">Class Resources</h3><div className="mt-3 space-y-2">{(data.resources||[]).map((r:AnyRow)=><div key={r.id} className="rounded-xl border p-3 text-xs"><b>{r.title}</b><div className="text-slate-400">{r.resource_type}</div></div>)}</div><div className="mt-4 rounded-xl bg-slate-50 p-3"><input type="file" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="w-full text-xs"/><input value={externalUrl} onChange={(e)=>setExternalUrl(e.target.value)} placeholder="or external / YouTube URL" className="mt-2 w-full rounded-lg border px-3 py-2 text-xs"/><button onClick={upload} className="mt-2 flex items-center gap-2 rounded-lg bg-[#14256f] px-3 py-2 text-xs font-black text-white"><Upload className="h-3.5 w-3.5"/>Add Resource</button></div></Card></div></div>;
}

function Input({label,value,onChange,type="text"}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){return<label className="block text-xs font-bold text-slate-500">{label}<input type={type} value={value} onChange={(e)=>onChange(e.target.value)} required={!["endsAt"].includes(label)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#14256f]"/></label>}
function Th({children}:{children:React.ReactNode}){return<th className="px-3 py-3 font-black">{children}</th>}
function Td({children}:{children:React.ReactNode}){return<td className="px-3 py-3 align-top">{children}</td>}
function Row({k,v}:{k:string;v:any}){return<div className="flex justify-between gap-4"><dt className="text-slate-400">{k}</dt><dd className="text-right font-bold">{v||"—"}</dd></div>}
