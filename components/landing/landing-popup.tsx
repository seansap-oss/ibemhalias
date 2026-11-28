"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Megaphone, X } from "lucide-react";

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

const FALLBACK_ANNOUNCEMENT: PopupPayload = {
  id: "default-announcement",
  title: "Ibemhal IAS · Admissions & Live Batches Open",
  message:
    "Join Manipur's premier low-fee Civil Services institute across our 3 Imphal centres (Keishampat, Chingmeirong, Thangmeiband) or online from anywhere.\n\nExplore our UPSC CSE, MPSC, Banking, and SSC programmes, or talk to our AI Concierge anytime for batch recommendations and instant UPI fee receipts.",
  ctaText: "Explore Courses & Fees",
  ctaHref: "/courses",
  badgeText: "Latest Notice",
  enabled: true,
};

export function LandingPopup({ autoOpen = true }: { autoOpen?: boolean }) {
  const [popup, setPopup] = React.useState<PopupPayload | null>(null);
  const [open, setOpen] = React.useState(false);

  const loadPopup = React.useCallback(async (forceShow = false) => {
    try {
      const res = await fetch("/api/cms/content?section=landing_popup", { cache: "no-store" });
      const data = res.ok ? await res.json() : { items: [] };
      const item = (data.items || [])[0];

      if (!item) {
        const seenFallback =
          typeof window !== "undefined" &&
          sessionStorage.getItem(`ibemhal-popup-seen-${FALLBACK_ANNOUNCEMENT.id}`);
        if (forceShow || !seenFallback) {
          setPopup(FALLBACK_ANNOUNCEMENT);
          setOpen(true);
        }
        return;
      }

      let meta: any = {};
      try {
        meta = JSON.parse(item.description || "{}");
      } catch {
        meta = { message: item.description || "" };
      }

      const payload: PopupPayload = {
        id: item.id,
        title: item.title || "Special Announcement",
        message: meta.message || "",
        ctaText: meta.ctaText || "Explore Courses",
        ctaHref: meta.ctaHref || "/courses",
        badgeText: meta.badgeText || "Important Update",
        imageUrl: item.media_url || item.external_url || undefined,
        enabled: meta.enabled !== false,
      };

      if (!payload.enabled && !forceShow) return;

      if (!forceShow) {
        const seenKey = `ibemhal-popup-seen-${item.id}`;
        if (typeof window !== "undefined" && sessionStorage.getItem(seenKey)) {
          return;
        }
      }

      setPopup(payload.enabled ? payload : FALLBACK_ANNOUNCEMENT);
      setOpen(true);
    } catch {
      const seenFallback =
        typeof window !== "undefined" &&
        sessionStorage.getItem(`ibemhal-popup-seen-${FALLBACK_ANNOUNCEMENT.id}`);
      if (forceShow || !seenFallback) {
        setPopup(FALLBACK_ANNOUNCEMENT);
        setOpen(true);
      }
    }
  }, []);

  React.useEffect(() => {
    if (autoOpen) {
      void loadPopup(false);
    }
  }, [autoOpen, loadPopup]);

  React.useEffect(() => {
    const handler = () => {
      void loadPopup(true);
    };
    window.addEventListener("ibemhal:open-popup", handler);
    return () => window.removeEventListener("ibemhal:open-popup", handler);
  }, [loadPopup]);

  const dismiss = () => {
    if (popup && typeof window !== "undefined") {
      sessionStorage.setItem(`ibemhal-popup-seen-${popup.id}`, "1");
    }
    setOpen(false);
  };

  if (!open || !popup) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/65 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:p-6"
      onClick={dismiss}
    >
      <div
        className="relative flex max-h-[82vh] w-[92vw] max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#e5dfd4] bg-[#faf8f4] shadow-2xl overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close announcement"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200 hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 overflow-y-auto">
          {popup.imageUrl && (
            <div className="max-h-[40vh] w-full overflow-hidden bg-slate-100">
              <img
                src={popup.imageUrl}
                alt={popup.title}
                className="h-full max-h-[40vh] w-full object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-8 lg:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-900">
              <Megaphone className="h-3.5 w-3.5" />
              {popup.badgeText}
            </span>

            <h2 className="mt-4 font-serif text-2xl font-bold leading-snug text-[#14256f] sm:text-3xl">
              {popup.title}
            </h2>

            {popup.message && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-base">
                {popup.message}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e5dfd4] bg-white px-4 py-3 text-xs font-semibold text-slate-700">
              <MapPin className="h-4 w-4 shrink-0 text-[#c37a26]" />
              <span>
                Imphal Centres: <strong className="text-[#14256f]">Keishampat</strong> ·{" "}
                <strong className="text-[#14256f]">Chingmeirong</strong> ·{" "}
                <strong className="text-[#14256f]">Thangmeiband</strong>
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={popup.ctaHref}
                onClick={dismiss}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#14256f] px-6 text-sm font-black text-white shadow-md hover:bg-[#1d348f]"
              >
                {popup.ctaText} <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  dismiss();
                  window.dispatchEvent(
                    new CustomEvent("ibemhal:open-concierge", { detail: { tab: "ai" } })
                  );
                }}
                className="inline-flex min-h-12 items-center rounded-xl border border-amber-300 bg-amber-50 px-5 text-xs font-black text-[#14256f] hover:bg-amber-100"
              >
                Ask AI Advisor
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
