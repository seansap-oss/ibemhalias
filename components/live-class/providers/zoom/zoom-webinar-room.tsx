"use client";

import * as React from "react";
import { ExternalLink, Loader2, Radio, ShieldCheck } from "lucide-react";
import { ZoomEngagementPanel } from "@/components/live-class/providers/zoom/zoom-engagement-panel";

export function ZoomWebinarRoom({ classId, mode }: { classId: string; mode: "student" | "teacher" }) {
  const [url, setUrl] = React.useState("");
  const [preparing, setPreparing] = React.useState(mode === "teacher");
  const [error, setError] = React.useState("");
  const [joined, setJoined] = React.useState(false);
  React.useEffect(() => {
    if (mode !== "teacher") return;
    let cancelled = false;
    fetch("/api/zoom/webinar/provision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || "Unable to prepare webinar."); if (!cancelled) { setUrl(data.webinar?.joinUrl || ""); setPreparing(false); } })
      .catch((reason) => { if (!cancelled) { setError(reason?.message || "Unable to prepare Live Now."); setPreparing(false); } });
    return () => { cancelled = true; };
  }, [classId, mode]);
  React.useEffect(() => {
    if (mode !== "student") return;
    const record = (action: "join" | "heartbeat" | "leave") => fetch("/api/live-class/engagement", { method: "POST", keepalive: action === "leave", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, action }) }).catch(() => undefined);
    const receive = (event: MessageEvent) => { if (event.origin !== window.location.origin || event.data?.type !== "ibemhal-zoom-session") return; if (event.data?.event === "joined") { setJoined(true); void record("join"); } if (event.data?.event === "leaving") { void record("leave"); } };
    window.addEventListener("message", receive);
    const heartbeat = window.setInterval(() => { if (joined) void record("heartbeat"); }, 45000);
    return () => { window.removeEventListener("message", receive); window.clearInterval(heartbeat); if (joined) void record("leave"); };
  }, [classId, joined, mode]);
  if (preparing) return <div className="grid min-h-[72vh] place-items-center bg-slate-50 text-[#14256f]"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin"/><div className="mt-4 text-lg font-black">Preparing your webinar…</div></div></div>;
  if (error) return <div className="grid min-h-[72vh] place-items-center bg-slate-50 p-6"><div className="max-w-lg rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm"><Radio className="mx-auto h-7 w-7 text-amber-600"/><div className="mt-4 text-lg font-black text-slate-900">Live Now needs setup</div><div className="mt-2 text-sm text-slate-500">{error}</div><div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">Administrator: check Admin → Zoom Integration.</div></div></div>;
  const src = `/live-now-zoom.html?classId=${encodeURIComponent(classId)}&mode=${encodeURIComponent(mode)}`;
  return <div className="min-h-[calc(100vh-52px)] bg-slate-100 p-3 lg:p-5">{mode === "teacher" && url ? <div className="mx-auto mb-3 flex max-w-[1800px] items-center justify-between gap-3 rounded-2xl bg-[#14256f] px-4 py-2.5 text-white"><div className="flex items-center gap-2 text-[11px] font-bold text-white/80"><ShieldCheck className="h-4 w-4 text-emerald-300"/>Backup host link ready</div><a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[10px] font-black"><ExternalLink className="h-3.5 w-3.5"/>Open backup link</a></div> : null}<div className="mx-auto grid max-w-[1800px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]"><iframe title="Ibemhal IAS Live Now" src={src} className="h-[calc(100vh-112px)] min-h-[640px] w-full border-0 bg-[#07101f]" allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write" allowFullScreen /><ZoomEngagementPanel classId={classId} mode={mode} joined={joined} /></div></div>;
}
