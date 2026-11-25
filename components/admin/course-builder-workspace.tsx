"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Module = { id: string; title: string; order_index: number };
type Asset = { id: string; asset_number: string; module_id: string | null; title: string; media_type: string; file_name: string | null };
type Course = { id: string; course_code: string; title: string; slug: string; description: string; exam_family: string; exam_name: string; exam_stage: string; language: string; price_inr: number; duration_months: number; is_published: boolean };

export function CourseBuilderWorkspace({ id }: { id?: string }) {
  const router = useRouter();
  const [course, setCourse] = React.useState<Course | null>(null);
  const [modules, setModules] = React.useState<Module[]>([]);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [form, setForm] = React.useState({ title: "", description: "", examFamily: "national", examName: "UPSC Civil Services", examStage: "foundation", language: "English", priceInr: "", durationMonths: "12" });
  const [moduleTitle, setModuleTitle] = React.useState("");
  const [moduleId, setModuleId] = React.useState("");
  const [assetTitle, setAssetTitle] = React.useState("");
  const [externalUrl, setExternalUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    const response = await fetch(`/api/admin/course-builder?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error || "Unable to load course");
    setCourse(body.course); setModules(body.modules || []); setAssets(body.assets || []);
    setForm({ title: body.course.title, description: body.course.description, examFamily: body.course.exam_family, examName: body.course.exam_name, examStage: body.course.exam_stage, language: body.course.language, priceInr: String(body.course.price_inr), durationMonths: String(body.course.duration_months || 12) });
    if (body.modules?.length) setModuleId((current) => current || body.modules[0].id);
  }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { const params = new URLSearchParams(window.location.search); const uploadError = params.get("uploadError"); const published = params.get("published"); if (uploadError) setMessage(`Course saved as a draft, but the material was not attached: ${uploadError}. Please add the material again below.`); if (published) setMessage(`“${published}” was published successfully. This is a fresh form for your next course.`); }, []);

  async function createCourse(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (file && externalUrl) throw new Error("Choose a file or a URL for this material.");
      if (externalUrl && !/^https:\/\//i.test(externalUrl)) throw new Error("Use an HTTPS link for course material.");
      const response = await fetch("/api/admin/course-builder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "course", ...form, priceInr: Number(form.priceInr), durationMonths: Number(form.durationMonths) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save course");
      if (file || externalUrl) {
        try {
          const moduleResponse = await fetch("/api/admin/course-builder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "module", courseId: body.course.id, title: moduleTitle.trim() || "Course materials", orderIndex: 0 }) });
          const moduleBody = await moduleResponse.json();
          if (!moduleResponse.ok) throw new Error(moduleBody.error || "Unable to create materials module");
          await uploadAsset(body.course.id, body.course.slug, moduleBody.module.id);
        } catch (cause) {
          router.push(`/admin/courses/${body.course.id}/edit?uploadError=${encodeURIComponent(cause instanceof Error ? cause.message : "Upload failed")}`);
          return;
        }
      }
      router.push(`/admin/courses/${body.course.id}/edit`);
    }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to create course"); } finally { setBusy(false); }
  }
  async function saveDetails(event: React.FormEvent) {
    event.preventDefault(); if (!course) return; setBusy(true); setMessage("");
    try { const response = await fetch("/api/admin/course-builder", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "details", id: course.id, ...form }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); await load(); setMessage("Course details saved."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to save course"); } finally { setBusy(false); }
  }
  async function addModule() {
    if (!course) return; setBusy(true); setMessage("");
    try { const response = await fetch("/api/admin/course-builder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "module", courseId: course.id, title: moduleTitle, orderIndex: modules.length }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setModuleTitle(""); setModuleId(body.module.id); await load(); setMessage("Module added."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to add module"); } finally { setBusy(false); }
  }
  async function uploadAsset(courseId: string, slug: string, selectedModuleId: string) {
      let upload: Record<string, unknown> = {};
      if (file) { const data = new FormData(); data.set("file", file); data.set("section_path", `courses/${slug}`); const response = await fetch("/api/cms/upload", { method: "POST", body: data }); upload = await response.json(); if (!response.ok) throw new Error(String(upload.error || "Upload failed")); }
      const extension = file?.name.split(".").pop()?.toLowerCase();
      const linkExtension = externalUrl ? new URL(externalUrl).pathname.split(".").pop()?.toLowerCase() : null;
      const mediaType = externalUrl ? (/youtu(?:\.be|be\.com)/i.test(externalUrl) ? "youtube" : linkExtension === "pdf" ? "pdf" : ["doc", "docx"].includes(linkExtension || "") ? "word" : ["xls", "xlsx"].includes(linkExtension || "") ? "excel" : "video") : extension === "pdf" ? "pdf" : ["mp4", "webm", "mov"].includes(extension || "") ? "video" : ["doc", "docx"].includes(extension || "") ? "word" : ["xls", "xlsx"].includes(extension || "") ? "excel" : file?.type.startsWith("audio/") ? "audio" : file?.type.startsWith("image/") ? "image" : "file";
      const response = await fetch("/api/admin/course-builder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "asset", courseId, moduleId: selectedModuleId, title: assetTitle.trim() || file?.name || "Course link", mediaType, storagePath: upload.storage_path, fileName: upload.file_name, fileSize: upload.file_size, mimeType: upload.mime_type, externalUrl }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      return body.asset;
  }
  async function addAsset() {
    if (!course || !moduleId) return; setBusy(true); setMessage("");
    try {
      const asset = await uploadAsset(course.id, course.slug, moduleId);
      setAssetTitle(""); setExternalUrl(""); setFile(null); await load(); setMessage(`${asset.asset_number} added to the course.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to add asset"); } finally { setBusy(false); }
  }
  async function publish() {
    if (!course) return; setBusy(true); setMessage("");
    try { const response = await fetch("/api/admin/course-builder", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: course.id, action: "publish", published: !course.is_published }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); if (!course.is_published) { router.replace(`/admin/courses/new?published=${encodeURIComponent(course.title)}`); return; } await load(); setMessage("Course moved to draft."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to update course"); } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f5f7fb] p-5 text-slate-900 lg:p-8"><div className="mx-auto max-w-6xl"><Link href="/admin/courses" className="text-sm font-bold text-indigo-700">← Course catalogue</Link><header className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Admin / Course builder · Version 5.9.0</p><h1 className="mt-2 text-3xl font-black">{course ? course.title : "Create a course"}</h1><p className="mt-1 text-sm text-slate-500">Save the course, then publish it. Modules and files can be added later.</p></div>{course && <button disabled={busy} onClick={() => void publish()} className="rounded-xl bg-[#465fe4] px-5 py-3 text-sm font-bold text-white">{course.is_published ? "Move to draft" : "Publish course"}</button>}</header>
    {message && <div role="status" className={`mt-5 rounded-xl border p-4 text-sm ${message.includes("was published successfully") ? "border-green-200 bg-green-50 text-green-900" : "bg-white"}`}><b>{message}</b>{message.includes("was published successfully") && <Link href="/admin/courses" className="ml-3 font-bold underline">View course catalogue</Link>}</div>}
    <div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">1. Course identity</h2><form id="course-details-form" onSubmit={course ? saveDetails : createCourse} className="mt-4 grid gap-4 sm:grid-cols-2">{[["Exam family", "examFamily", ["national", "banking", "state", "other"]], ["Stage / subcategory", "examStage", ["foundation", "prelims", "mains", "optional", "test-series", "interview", "complete", "practice"]]].map(([label, key, options]) => <label className="text-xs font-bold" key={String(key)}>{label}<select value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key as string]: event.target.value })} className="mt-2 block w-full rounded-xl border bg-white p-3 text-sm">{(options as string[]).map((option) => <option value={option} key={option}>{option.replace("-", " ")}</option>)}</select></label>)}<label className="text-xs font-bold">Exam name<input value={form.examName} onChange={(event) => setForm({ ...form, examName: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm" required /></label><label className="text-xs font-bold">Language<input value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><label className="text-xs font-bold sm:col-span-2">Course name<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm" required /></label><label className="text-xs font-bold sm:col-span-2">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm" rows={3} required /></label><label className="text-xs font-bold">Price (₹)<input type="number" min="0" value={form.priceInr} onChange={(event) => setForm({ ...form, priceInr: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm" required /></label><label className="text-xs font-bold">Access duration (months)<input type="number" min="1" value={form.durationMonths} onChange={(event) => setForm({ ...form, durationMonths: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm" required /></label><button disabled={busy} className="rounded-xl bg-[#465fe4] px-4 py-3 text-sm font-bold text-white sm:col-span-2">{busy ? "Saving…" : course ? "Save course details" : "Save course draft"}</button></form>{course && <p className="mt-4 text-xs text-slate-500">{course.course_code} · {course.is_published ? "Published" : "Draft"} · ₹{course.price_inr.toLocaleString("en-IN")}</p>}</section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">2. Teaching structure</h2><p className="mt-1 text-sm text-slate-500">Create modules, then attach PDFs, video, Word or other files.</p>{modules.map((module) => <div key={module.id} className="mt-4 rounded-xl border p-4"><b>{module.title}</b>{assets.filter((asset) => asset.module_id === module.id).map((asset) => <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm" key={asset.id}><span>{asset.title}<small className="block font-mono text-slate-400">{asset.asset_number} · {asset.media_type}</small></span></div>)}</div>)}{course ? <div className="mt-5 flex gap-2"><input aria-label="Module title" value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} placeholder="e.g. Indian Polity" className="min-w-0 flex-1 rounded-xl border p-3 text-sm" /><button disabled={busy || !moduleTitle.trim()} onClick={() => void addModule()} className="rounded-xl border border-indigo-300 px-4 text-sm font-bold text-indigo-700">+ Module</button></div> : <p className="mt-5 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-700">Save the course draft to add modules.</p>}</section></div>
    {!course && <section className="mt-5 rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">3. Add your first material</h2><p className="mt-1 text-sm text-slate-500">Choose a PDF, MP4, Word document, other supported file, or an HTTPS link. It will upload when you save the course draft above.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold">Module name<input value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} placeholder="Course materials" className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><label className="text-xs font-bold">Material title<input value={assetTitle} onChange={(event) => setAssetTitle(event.target.value)} placeholder="Introduction notes" className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><label className="text-xs font-bold">Upload a file<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.webm,.mp3,.wav,.m4a,.jpg,.jpeg,.png,.webp,.gif" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><label className="text-xs font-bold">Or paste an HTTPS link<input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label></div><button type="submit" form="course-details-form" disabled={busy} className="mt-5 rounded-xl bg-[#465fe4] px-5 py-3 text-sm font-bold text-white">{busy ? "Saving…" : "Save course and material"}</button></section>}
    {course && <section className="mt-5 rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">3. Add materials (optional)</h2><p className="mt-1 text-sm text-slate-500">A text-only course can be published now. Add files later; each gets a permanent asset number.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold">Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value)} className="mt-2 block w-full rounded-xl border bg-white p-3 text-sm"><option value="">Choose module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label><label className="text-xs font-bold">Asset title<input value={assetTitle} onChange={(event) => setAssetTitle(event.target.value)} placeholder="Constitution quick notes" className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><label className="text-xs font-bold">Upload PDF, video, Word or file<input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><label className="text-xs font-bold">Or use an HTTPS video URL<input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label></div><button disabled={busy || !moduleId || (!file && !externalUrl)} onClick={() => void addAsset()} className="mt-5 rounded-xl bg-[#465fe4] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? "Uploading…" : "Add to course"}</button><p className="mt-3 text-xs text-slate-500">Course uploads use the protected institute storage. External video links stay with their provider.</p></section>}
  </div></main>;
}
