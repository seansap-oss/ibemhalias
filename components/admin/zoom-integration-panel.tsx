"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Radio, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

type ZoomStatus = {
  configured: boolean;
  apiConfigured: boolean;
  sdkConfigured: boolean;
  hostConfigured: boolean;
  hostEmail: string | null;
  sdkVersion: string;
  missing: string[];
};
type HostStatus = { email: string; licensed: boolean; webinarEnabled: boolean; webinarCapacity: number; meetingCapacity: number };

export function ZoomIntegrationPanel() {
  const [status, setStatus] = React.useState<ZoomStatus | null>(null);
  const [provider, setProvider] = React.useState("");
  const [host, setHost] = React.useState<HostStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [testing, setTesting] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/zoom/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to load Zoom status.");
      setStatus(data.status);
      setProvider(data.provider || "");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load Zoom status."); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const test = async () => {
    setTesting(true);
    setMessage("");
    try {
      const response = await fetch("/api/zoom/status", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Zoom check failed.");
      setHost(data.host);
      setMessage("Zoom OAuth and host lookup passed. Start a rehearsal class to verify video and student joining.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Zoom check failed."); }
    finally { setTesting(false); }
  };

  const checks = status ? [
    ["Server-to-Server OAuth", status.apiConfigured],
    ["Meeting SDK credentials", status.sdkConfigured],
    ["Host email set", status.hostConfigured],
    ["Zoom selected for classroom", provider === "zoom"],
  ] as const : [];

  return <div className="space-y-6">
    <div>
      <div className="text-xs font-black uppercase tracking-[.15em] text-blue-700">Live Now Provider</div>
      <h1 className="mt-1 text-2xl font-black">Zoom Meetings & Webinars</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Use a short Meeting for a small class or a licensed Webinar for a large audience. The format is selected when scheduling each class.</p>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Radio className="h-5 w-5"/></div>
          <div className="flex-1"><h2 className="font-black">Connection readiness</h2><p className="text-xs text-slate-500">Meeting SDK Web {status?.sdkVersion || "6.2.0"}</p></div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin"/> : <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${status?.configured && provider === "zoom" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{status?.configured && provider === "zoom" ? "Ready to test" : "Setup needed"}</span>}
        </div>
        <div className="mt-5 space-y-2">{checks.map(([label, ok]) => <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600"/> : <XCircle className="h-4 w-4 text-amber-500"/>}<span className="flex-1 text-xs font-black text-slate-700">{label}</span></div>)}</div>
        <div className="mt-5 rounded-2xl border p-4 text-xs"><div className="font-black text-slate-500">Configured host</div><div className="mt-1 font-semibold text-slate-800">{status?.hostEmail || "Not set"}</div></div>
        {host ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border p-4 text-xs"><div className="font-black text-slate-500">Meetings</div><div className="mt-1 font-semibold">{host.meetingCapacity ? `${host.meetingCapacity} participant capacity reported by Zoom` : "Capacity not reported by Zoom; check the host account"}</div></div><div className="rounded-2xl border p-4 text-xs"><div className="font-black text-slate-500">Webinars</div><div className="mt-1 font-semibold">{host.webinarEnabled ? (host.webinarCapacity ? `${host.webinarCapacity} attendee capacity reported by Zoom` : "Webinar enabled; capacity not reported") : "No Webinar licence reported"}</div></div></div> : null}
        <div className="mt-5 flex gap-3"><button onClick={() => void test()} disabled={testing || !status?.configured} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102968] px-4 text-xs font-black text-white disabled:opacity-40"><ShieldCheck className="h-4 w-4"/>{testing ? "Checking…" : "Check Zoom host"}</button><button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
        {message ? <div role="status" className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-600">{message}</div> : null}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Account setup</h2><p className="mt-2 text-xs leading-5 text-slate-500">Use a free Zoom account in a test environment. Use the licensed Webinar host in production. Secrets stay on the server.</p><div className="mt-5 space-y-2 font-mono text-[11px]">{["ZOOM_ACCOUNT_ID", "ZOOM_API_CLIENT_ID", "ZOOM_API_CLIENT_SECRET", "ZOOM_MEETING_SDK_CLIENT_ID", "ZOOM_MEETING_SDK_CLIENT_SECRET", "ZOOM_HOST_EMAIL", "NEXT_PUBLIC_LIVE_NOW_PROVIDER=zoom"].map(name => <div key={name} className="rounded-xl bg-slate-950 px-3 py-2.5 text-slate-200">{name}</div>)}</div><div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">For a complete test, schedule a 10-minute Meeting, join as teacher and assigned student, then repeat with the Webinar licence.</div></div>
    </div>
  </div>;
}
