"use client";

import * as React from "react";
import {
  CheckCircle2,
  Cloud,
  FileText,
  FolderOpen,
  HardDrive,
  Loader2,
  Upload,
} from "lucide-react";

const materialTypes = ["Study note", "Assignment", "Presentation", "Worksheet", "Reference"];

function bytes(value: unknown) {
  const amount = Number(value || 0);
  if (!amount) return "—";
  if (amount < 1024 * 1024) return `${Math.ceil(amount / 1024)} KB`;
  return `${(amount / 1024 / 1024).toFixed(1)} MB`;
}

function syncLabel(value: string) {
  if (value === "ready_to_sync") return "Drive sync ready";
  if (value === "folder_assigned") return "Folder assigned";
  if (value === "not_configured") return "Awaiting Drive";
  return value.replace(/_/g, " ");
}

export function TeacherMaterialsWorkspace() {
  const [data, setData] = React.useState<any>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [courseId, setCourseId] = React.useState("");
  const [materialType, setMaterialType] = React.useState("Study note");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const load = React.useCallback(async () => {
    const response = await fetch("/api/teacher/workspace", { cache: "no-store" });
    const next = await response.json();
    if (!response.ok || !next.ok) throw new Error(next.error || "Unable to load workspace.");
    setData(next);
  }, []);

  React.useEffect(() => {
    void load().catch((error) => setMessage(error.message));
  }, [load]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setMessage("Choose a file to upload.");
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title);
      form.set("courseId", courseId);
      form.set("materialType", materialType.toLowerCase().replace(/\s+/g, "_"));
      const response = await fetch("/api/teacher/workspace", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Upload failed.");
      setFile(null);
      setTitle("");
      setMessage("Material saved to the institute workspace. Local backup and Drive status are recorded below.");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !message) {
    return <div className="grid min-h-[55vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>;
  }

  const courses: any[] = data?.courses || [];
  const materials: any[] = data?.materials || [];
  const storage = data?.storage || {};
  const courseMap = new Map<string, string>(
    courses.map((course: any): [string, string] => [
      String(course.id),
      String(course.title),
    ])
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-600">My workspace</div>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Study materials</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Create, organize and safely record every teaching material for your assigned courses.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800"><CheckCircle2 className="h-4 w-4" />Admin and Owner can review this activity</div>
      </div>

      {message ? <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_330px]">
        <form onSubmit={upload} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-indigo-600">New material</div><h2 className="mt-1 text-xl font-black">Upload &amp; sync</h2><p className="mt-1 text-xs leading-5 text-slate-500">Your file is saved to the protected institute workspace first.</p></div><Upload className="h-6 w-6 text-indigo-600" /></div>
          <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-4 text-center transition hover:bg-indigo-50"><Upload className="h-6 w-6 text-indigo-600" /><strong className="mt-2 text-sm">{file ? file.name : "Drop a file here or browse"}</strong><span className="mt-1 text-[11px] text-slate-500">PDF, DOCX, PPTX, image or video · Maximum 50 MB</span><input className="sr-only" type="file" onChange={(event) => { const next = event.target.files?.[0] || null; setFile(next); if (next && !title) setTitle(next.name.replace(/\.[^/.]+$/, "")); }} /></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-[10px] font-black uppercase tracking-[.08em] text-slate-500">Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Fundamental Rights notes" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-indigo-500" /></label><label className="text-[10px] font-black uppercase tracking-[.08em] text-slate-500">Course<select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-indigo-500"><option value="">General teaching material</option>{courses.map((course: any) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label></div>
          <label className="mt-4 block text-[10px] font-black uppercase tracking-[.08em] text-slate-500">Material type<select value={materialType} onChange={(event) => setMaterialType(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-indigo-500">{materialTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button disabled={busy} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102968] px-5 text-xs font-black text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? "Saving material…" : "Upload material"}</button>
        </form>

        <aside className="space-y-4"><section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-indigo-600">Storage</div><h2 className="mt-1 font-black">Backup status</h2></div><HardDrive className="h-5 w-5 text-indigo-600" /></div><div className="mt-5 space-y-3"><div className="flex gap-3 rounded-2xl bg-slate-50 p-3"><HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /><div><div className="text-xs font-black">Local Data Vault</div><p className="mt-1 text-[10px] leading-4 text-slate-500">Queued for the office PC backup: {storage.local_backup_label || "IBEMHAL_DATA / teacher-materials"}</p></div></div><div className="flex gap-3 rounded-2xl bg-slate-50 p-3"><Cloud className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /><div><div className="text-xs font-black">Google Drive</div><p className="mt-1 text-[10px] leading-4 text-slate-500">{storage.google_drive_folder_name || storage.google_drive_folder_url || "No folder assigned by Admin yet"}</p><div className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">{storage.drive_sync_enabled ? "Drive mirror active" : "Awaiting Drive connection"}</div></div></div></div></section><section className="rounded-[28px] border border-indigo-100 bg-indigo-50 p-5"><FolderOpen className="h-5 w-5 text-indigo-700" /><h2 className="mt-3 text-sm font-black text-indigo-950">Institute-controlled workspace</h2><p className="mt-2 text-[11px] leading-5 text-indigo-900/75">Files remain traceable to your staff account. Admin assigns the Drive folder and has full oversight.</p></section></aside>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5"><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-indigo-600">Activity</div><h2 className="mt-1 text-lg font-black">Recent uploads</h2></div><span className="text-xs font-bold text-slate-400">{materials.length} material{materials.length === 1 ? "" : "s"}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-500"><tr><th className="px-5 py-3">Material</th><th className="px-5 py-3">Course</th><th className="px-5 py-3">Size</th><th className="px-5 py-3">Saved</th><th className="px-5 py-3">Backup</th></tr></thead><tbody>{materials.map((item: any) => <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-4"><div className="flex items-center gap-3"><FileText className="h-4 w-4 shrink-0 text-indigo-600" /><div><div className="font-black text-slate-900">{item.title}</div><div className="mt-1 text-[10px] text-slate-500">{item.file_name} · {item.material_type.replace(/_/g, " ")}</div></div></div></td><td className="px-5 py-4 text-slate-600">{courseMap.get(item.course_id) || "General"}</td><td className="px-5 py-4 text-slate-600">{bytes(item.file_size)}</td><td className="px-5 py-4 text-slate-600">{new Date(item.created_at).toLocaleDateString()}</td><td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{syncLabel(item.google_drive_status)}</span></td></tr>)}{!materials.length ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">Your uploaded teaching materials will appear here.</td></tr> : null}</tbody></table></div></section>
    </div>
  );
}
