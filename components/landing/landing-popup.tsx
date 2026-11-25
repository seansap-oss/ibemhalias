"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Megaphone, X } from "lucide-react";

type PopupPayload = {
  id: string;
  title: string;
  message: string;
  ctaText: string;
  ctaHref: string;
  badgeText?: string;
  imageUrl?: string;
  enabled: boolean;
};

export function LandingPopup() {
  const [popup, setPopup] = React.useState<PopupPayload | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/cms/content?section=landing_popup", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return;
        const item = (data.items || [])[0];
        if (!item) return;

        let meta: any = {};
        try {
          meta = JSON.parse(item.description || "{}");
        } catch {
          meta = { message: item.description || "" };
        }

        if (meta.enabled === false) return;

        const seenKey = `ibemhal-popup-seen-${item.id}`;
        if (typeof window !== "undefined" && sessionStorage.getItem(seenKey)) {
          return;
        }

        setPopup({
          id: item.id,
          title: item.title || "Special Announcement",
          message: meta.message || "",
          ctaText: meta.ctaText || "Explore Courses",
          ctaHref: meta.ctaHref || "/courses",
          badgeText: meta.badgeText || "Important Update",
          imageUrl: item.media_url || item.external_url || undefined,
          enabled: true,
        });
        setOpen(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    if (popup && typeof window !== "undefined") {
      sessionStorage.setItem(`ibemhal-popup-seen-${popup.id}`, "1");
    }
    setOpen(false);
  };

  if (!open || !popup) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#e5dfd4] bg-[#faf8f4] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close announcement"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
        >
          <X className="h-4 w-4" />
        </button>

        {popup.imageUrl && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
            <img
              src={popup.imageUrl}
              alt={popup.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900">
            <Megaphone className="h-3.5 w-3.5" />
            {popup.badgeText}
          </span>
          <h2 className="mt-3 font-serif text-2xl font-bold text-[#14256f]">
            {popup.title}
          </h2>
          {popup.message && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {popup.message}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={popup.ctaHref}
              onClick={dismiss}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#14256f] px-5 text-sm font-black text-white shadow hover:bg-[#1d348f]"
            >
              {popup.ctaText} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
