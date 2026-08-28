"use client";

import * as React from "react";
import { Check, ExternalLink, Loader2, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { broadcastSiteTheme, type SiteTheme } from "@/components/theme/site-theme-provider";

const options: Array<{ id: SiteTheme; title: string; description: string }> = [
  {
    id: "classic",
    title: "Classic / Simple",
    description: "The current blue and white Ibemhal IAS website. Existing routes and behavior remain unchanged.",
  },
  {
    id: "premium",
    title: "Premium Emerald & Gold",
    description: "Dark emerald, antique gold and ivory styling based on the approved premium mockups, including hero, menus, achievers and public pages.",
  },
];

export function SiteThemeManager() {
  const [theme, setTheme] = React.useState<SiteTheme>("classic");
  const [savedTheme, setSavedTheme] = React.useState<SiteTheme>("classic");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    let active = true;
    fetch("/api/admin/site-theme", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Could not load website theme.");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        const current: SiteTheme = payload.theme === "premium" ? "premium" : "classic";
        setTheme(current);
        setSavedTheme(current);
      })
      .catch((error) => active && setMessage(error instanceof Error ? error.message : "Could not load theme."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/site-theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save website theme.");
      const next: SiteTheme = payload.theme === "premium" ? "premium" : "classic";
      setSavedTheme(next);
      setTheme(next);
      broadcastSiteTheme(next);
      setMessage(next === "premium" ? "Premium theme is now active." : "Classic theme is now active.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save website theme.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-[360px] place-items-center rounded-3xl border border-slate-200 bg-white"><div className="flex items-center gap-3 text-sm font-bold text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Loading website theme…</div></div>;
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 bg-gradient-to-r from-[#f7f9ff] via-white to-[#eff9f4] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#07372f] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-[#efc36e]"><Palette className="h-4 w-4" />Website Theme</div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Classic or Premium</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">The switch changes public presentation only. CMS data, routes, logins, Student Portal, Live Now and Supabase logic stay shared.</p>
            </div>
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm">Preview Website <ExternalLink className="h-4 w-4" /></a>
          </div>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-2 md:p-8">
          {options.map((option) => {
            const selected = theme === option.id;
            const premium = option.id === "premium";
            return (
              <button key={option.id} type="button" onClick={() => setTheme(option.id)} aria-pressed={selected} className={`relative overflow-hidden rounded-[26px] border p-5 text-left transition ${selected ? "border-[#c89745] ring-2 ring-[#c89745]/20" : "border-slate-200"} ${premium ? "bg-[radial-gradient(circle_at_top_right,#165345_0,#07372f_45%,#03241f_100%)] text-white" : "bg-gradient-to-br from-white to-[#eef3ff]"}`}>
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-[.16em] ${premium ? "text-[#efc36e]" : "text-[#14256f]"}`}>{premium ? "Approved Premium" : "Safe Fallback"}</div>
                    <h2 className={`mt-4 text-xl font-black ${premium ? "font-serif text-[#f3d18b]" : "text-slate-950"}`}>{option.title}</h2>
                    <p className={`mt-2 text-sm leading-relaxed ${premium ? "text-[#f7ead2]/80" : "text-slate-600"}`}>{option.description}</p>
                  </div>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${selected ? premium ? "border-[#d4a34e] bg-[#d4a34e] text-[#07372f]" : "border-[#14256f] bg-[#14256f] text-white" : premium ? "border-[#d4a34e]/50 text-[#d4a34e]" : "border-slate-300 text-slate-400"}`}>{selected ? <Check className="h-4 w-4" /> : <Palette className="h-4 w-4" />}</span>
                </div>
                <div className={`mt-6 grid h-32 grid-cols-[30%_1fr] gap-3 rounded-2xl border p-3 ${premium ? "border-[#d4a34e]/35 bg-[#052e27]" : "border-blue-100 bg-white"}`}>
                  <div className={`rounded-xl ${premium ? "bg-[#0b493e]" : "bg-[#14256f]"}`} />
                  <div className={`rounded-xl ${premium ? "bg-[linear-gradient(135deg,#263a31,#9a7040)]" : "bg-gradient-to-br from-blue-100 to-indigo-200"}`} />
                </div>
              </button>
            );
          })}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-5 py-4 md:px-8">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><ShieldCheck className="h-4 w-4 text-green-600" />Live public theme: <strong className="text-slate-950">{savedTheme === "premium" ? "Premium Emerald & Gold" : "Classic / Simple"}</strong></div>
          <button type="button" onClick={save} disabled={saving || theme === savedTheme} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#07372f] px-5 text-sm font-black text-[#f3d18b] shadow-lg disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Apply Website Theme</button>
        </footer>
      </section>
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">{message}</div> : null}
    </div>
  );
}
