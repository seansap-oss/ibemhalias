"use client";
import * as React from "react";

export type CourseOption = { id: string; kind: string; label: string };
type Kind = "family" | "subcategory" | "exam" | "language";
const names: Record<Kind, string> = { family: "Exam family", subcategory: "Subcategory", exam: "Exam name", language: "Language" };

export function CourseOptionSelect({ kind, value, options, onChange, onReload }: { kind: Kind; value: string; options: CourseOption[]; onChange: (value: string) => void; onReload: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [editing, setEditing] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const choices = options.filter((item) => item.kind === kind);
  const currentMissing = value && !choices.some((item) => item.label === value);

  async function mutate(method: "POST" | "PATCH" | "DELETE", id?: string, label?: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(method === "DELETE" ? `/api/admin/course-options?id=${encodeURIComponent(id || "")}` : "/api/admin/course-options", { method, headers: { "content-type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(method === "POST" ? { kind, label } : { id, label }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save option");
      if (method === "POST") { onChange(result.option.label); setDraft(""); }
      if (method === "PATCH") { if (choices.find((item) => item.id === id)?.label === value) onChange(result.option.label); setEditing(""); setDraft(""); }
      if (method === "DELETE" && choices.find((item) => item.id === id)?.label === value) onChange("");
      await onReload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save option"); }
    finally { setBusy(false); }
  }

  return <div className="text-sm font-bold"><label htmlFor={`course-${kind}`}>{names[kind]}</label><select id={`course-${kind}`} required value={value} onChange={(event) => { if (event.target.value === "__custom") { setOpen(true); setEditing(""); setDraft(""); } else onChange(event.target.value); }} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"><option value="" disabled>Choose {names[kind].toLowerCase()}</option>{currentMissing && <option value={value}>{value} (used by this course)</option>}{choices.map((item) => <option key={item.id} value={item.label}>{item.label}</option>)}<option value="__custom">+ Custom…</option></select><button type="button" className="mt-2 text-xs font-bold text-indigo-700 underline" onClick={() => { setOpen(!open); setEditing(""); setDraft(""); }}>Manage options</button>{open && <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3"><p className="text-xs text-slate-600">{editing ? `Rename ${names[kind].toLowerCase()}` : `Add ${names[kind].toLowerCase()}`}</p><div className="mt-2 flex gap-2"><input aria-label={`New ${names[kind].toLowerCase()}`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={100} className="min-w-0 flex-1 rounded-lg border p-2 text-sm" placeholder={`New ${names[kind].toLowerCase()}`} /><button type="button" disabled={busy || !draft.trim()} onClick={() => void mutate(editing ? "PATCH" : "POST", editing || undefined, draft.trim())} className="rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-50">{editing ? "Save edit" : "Save option"}</button></div>{editing && <button type="button" className="mt-2 text-xs text-slate-600 underline" onClick={() => { setEditing(""); setDraft(""); }}>Cancel edit</button>}{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}<div className="mt-3 space-y-1 border-t pt-2">{choices.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 text-xs font-normal"><span className="truncate">{item.label}</span><span className="flex gap-2"><button type="button" className="text-indigo-700" onClick={() => { setEditing(item.id); setDraft(item.label); }}>Edit</button><button type="button" className="text-red-600" disabled={busy} onClick={() => void mutate("DELETE", item.id)}>Delete</button></span></div>)}</div><p className="mt-2 text-[11px] font-normal text-slate-500">Deleting a choice does not delete existing courses.</p></div>}</div>;
}
