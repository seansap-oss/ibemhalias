"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2, TestTube2 } from "lucide-react";

export default function TestStudentPage() {
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [result, setResult] = React.useState<any>(null);

  const prepare = async () => {
    setBusy(true); setMessage(""); setResult(null);
    try {
      const response = await fetch("/api/admin/test-student", { method: "POST", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Unable to create test student.");
      setResult(payload);
      setMessage("Test student is ready.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to create test student.");
    } finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-3xl space-y-5"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#174699]">Testing Tool</div><h1 className="mt-1 text-2xl font-black text-slate-950">Student Portal Test Account</h1><p className="mt-1 text-xs font-medium text-slate-500">Create or refresh one all-access student using the same convenient testing credentials as the admin login.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#174699]"><TestTube2 className="h-5 w-5" /></div><div><div className="text-sm font-black">Test credentials</div><div className="text-xs text-slate-500">admin@ibemhal.ias / admin@123</div></div></div><button onClick={() => void prepare()} disabled={busy} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#174699] px-4 text-sm font-black text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}{busy ? "Preparing…" : "Create / Refresh Test Student"}</button>{message ? <div className={`mt-4 rounded-xl p-3 text-xs font-bold ${result ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</div> : null}{result ? <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-green-800"><CheckCircle2 className="h-4 w-4" /> All-access test student ready</div><div className="mt-2 text-xs font-semibold text-green-700">Courses: {result.courses} · Live classes: {result.liveClasses}</div><Link href="/login?next=/dashboard" target="_blank" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-green-700 px-4 text-xs font-black text-white">Open Student Login <ExternalLink className="h-4 w-4" /></Link></div> : null}</div></div>;
}
