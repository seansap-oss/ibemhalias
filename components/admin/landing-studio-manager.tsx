"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
  Upload,
  Youtube,
} from "lucide-react";
import { CmsContentManager } from "@/components/admin/cms-content-manager";

type TabId = "hero" | "popup" | "archive" | "materials";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function LandingStudioManager() {
  const [tab, setTab] = React.useState<TabId>("hero");
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Hero state
  const [heroItems, setHeroItems] = React.useState<any[]>([]);
  const [heroType, setHeroType] = React.useState<"image" | "video" | "youtube">("image");
  const [heroTitle, setHeroTitle] = React.useState("");
  const [heroUrl, setHeroUrl] = React.useState("");
  const [heroStoragePath, setHeroStoragePath] = React.useState<string | null>(null);

  // Popup state
  const [popupItems, setPopupItems] = React.useState<any[]>([]);
  const [popupEnabled, setPopupEnabled] = React.useState(true);
  const [popupBadge, setPopupBadge] = React.useState("Special Offer");
  const [popupTitle, setPopupTitle] = React.useState("");
  const [popupMessage, setPopupMessage] = React.useState("");
  const [popupCtaText, setPopupCtaText] = React.useState("Explore Courses");
  const [popupCtaHref, setPopupCtaHref] = React.useState("/courses");
  const [popupImageStoragePath, setPopupImageStoragePath] = React.useState<string | null>(null);

  // Archive state
  const [archiveItems, setArchiveItems] = React.useState<any[]>([]);
  const [archTitle, setArchTitle] = React.useState("");
  const [archYear, setArchYear] = React.useState(2026);
  const [archMonth, setArchMonth] = React.useState("November");
  const [archCategory, setArchCategory] = React.useState("Current Affairs");
  const [archUrl, setArchUrl] = React.useState("");
  const [archStoragePath, setArchStoragePath] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    const [h, p, a] = await Promise.all([
      fetch("/api/cms/content?section=hero", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch("/api/cms/content?section=landing_popup", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch("/api/cms/content?section=digital_archive", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
    ]);
    setHeroItems(h.items || []);
    setPopupItems(p.items || []);
    setArchiveItems(a.items || []);
  }, []);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const uploadFileToStorage = async (
    file: File | null,
    sectionPath: string,
    onDone: (storagePath: string, fileName: string) => void
  ) => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("section_path", sectionPath);
      const res = await fetch("/api/cms/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data?.storage_path) {
        throw new Error(data?.error || "Upload failed");
      }
      onDone(data.storage_path, file.name);
      setMsg(`Uploaded ${file.name} — now click Save/Add below.`);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const addHeroSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/cms/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_path: "hero",
          title: heroTitle.trim() || "Ibemhal IAS Hero Media",
          media_type: heroType,
          storage_path: heroType !== "youtube" ? heroStoragePath : null,
          external_url:
            heroType === "youtube" || !heroStoragePath ? heroUrl.trim() : null,
          access_level: "free",
          is_published: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to add hero slide");
      setHeroTitle("");
      setHeroUrl("");
      setHeroStoragePath(null);
      setMsg("Added to Homepage Hero Carousel!");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Failed to add hero slide");
    } finally {
      setBusy(false);
    }
  };

  const savePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      for (const old of popupItems) {
        await fetch(`/api/cms/content/${encodeURIComponent(old.id)}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }

      const res = await fetch("/api/cms/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_path: "landing_popup",
          title: popupTitle.trim() || "Special Announcement",
          description: JSON.stringify({
            enabled: popupEnabled,
            badgeText: popupBadge,
            message: popupMessage,
            ctaText: popupCtaText,
            ctaHref: popupCtaHref,
          }),
          media_type: popupImageStoragePath ? "image" : "file",
          storage_path: popupImageStoragePath,
          access_level: "free",
          is_published: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to save popup");
      setMsg(popupEnabled ? "Homepage Popup is now LIVE!" : "Homepage Popup saved (Disabled).");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Failed to save popup");
    } finally {
      setBusy(false);
    }
  };

  const addArchivePdf = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/cms/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_path: "digital_archive",
          title: archTitle.trim(),
          description: JSON.stringify({
            year: archYear,
            month: archMonth,
            category: archCategory,
          }),
          media_type: "pdf",
          storage_path: archStoragePath,
          external_url: !archStoragePath ? archUrl.trim() : null,
          access_level: "free",
          is_published: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to add archived PDF");
      setArchTitle("");
      setArchUrl("");
      setArchStoragePath(null);
      setMsg(`Archived PDF for ${archMonth} ${archYear}!`);
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Failed to add archived PDF");
    } finally {
      setBusy(false);
    }
  };

  const deleteCmsItem = async (id: string) => {
    await fetch(`/api/cms/content/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadAll();
  };

  return (
    <div className="space-y-6">
      {/* Studio Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "hero", label: "1. Hero Photos & Videos", icon: ImageIcon },
            { id: "popup", label: "2. Homepage Popup", icon: Megaphone },
            { id: "archive", label: "3. 10-Year PDF Archive (2016–2026)", icon: Archive },
            { id: "materials", label: "4. Course & Resource Files", icon: Upload },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id as TabId);
                setMsg("");
                setErr("");
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                tab === id
                  ? "bg-[#14256f] text-white shadow"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-[#14256f] hover:bg-slate-50"
        >
          Preview Homepage <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
          {err}
        </div>
      )}
      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {msg}
        </div>
      )}

      {/* TAB 1: HERO MEDIA CAROUSEL */}
      {tab === "hero" && (
        <div className="space-y-6">
          <form
            onSubmit={addHeroSlide}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-black text-[#14256f]">
              Add Photo, CDN Video, or YouTube Embed to Hero Carousel
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "image", label: "Photo / Banner", icon: ImageIcon },
                { id: "video", label: "MP4 / CDN Video", icon: Film },
                { id: "youtube", label: "YouTube Embed", icon: Youtube },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setHeroType(id as any)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold ${
                    heroType === id
                      ? "border-[#14256f] bg-blue-50 text-[#14256f]"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Slide Title
                </label>
                <input
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="e.g., UPSC 2026 Classroom Session"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  {heroType === "youtube"
                    ? "YouTube URL *"
                    : "Media URL (or Upload Below) *"}
                </label>
                <input
                  required
                  value={heroUrl}
                  onChange={(e) => setHeroUrl(e.target.value)}
                  placeholder={
                    heroType === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://... (auto-filled when you upload)"
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {heroType !== "youtube" && (
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#14256f]/50 bg-blue-50/50 px-4 py-2.5 text-xs font-black text-[#14256f] hover:bg-blue-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload {heroType === "image" ? "Photo" : "Video"} from Computer
                  <input
                    type="file"
                    accept={heroType === "image" ? "image/*" : "video/*"}
                    className="hidden"
                    onChange={(e) =>
                      void uploadFileToStorage(
                        e.target.files?.[0] ?? null,
                        "hero",
                        (storagePath, fileName) => {
                          setHeroStoragePath(storagePath);
                          setHeroUrl(fileName);
                        }
                      )
                    }
                  />
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !heroUrl.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-5 py-2.5 text-xs font-black text-white hover:bg-[#1d348f] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add to Hero Carousel
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black text-[#14256f]">
              Active Hero Carousel Slides ({heroItems.length})
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {heroItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <div className="aspect-[16/9] bg-slate-100">
                    {item.media_type === "image" ? (
                      <img
                        src={item.media_url || item.external_url}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-slate-900 text-xs font-bold text-white">
                        {item.media_type?.toUpperCase()} · {item.title}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 text-xs">
                    <span className="truncate font-bold text-slate-800">
                      {item.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => void deleteCmsItem(item.id)}
                      className="text-red-600 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOMEPAGE POPUP */}
      {tab === "popup" && (
        <form
          onSubmit={savePopup}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-black text-[#14256f]">
              Homepage Welcome / Discount Popup
            </h2>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-black">
              <input
                type="checkbox"
                checked={popupEnabled}
                onChange={(e) => setPopupEnabled(e.target.checked)}
              />
              Enable Popup on Homepage
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Badge Label
              </label>
              <input
                value={popupBadge}
                onChange={(e) => setPopupBadge(e.target.value)}
                placeholder="e.g., Limited Time Offer / Discount"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Popup Headline *
              </label>
              <input
                required
                value={popupTitle}
                onChange={(e) => setPopupTitle(e.target.value)}
                placeholder="e.g., Flat 20% Off — New UPSC & SSC Batches!"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Popup Message
            </label>
            <textarea
              rows={3}
              value={popupMessage}
              onChange={(e) => setPopupMessage(e.target.value)}
              placeholder="Write your announcement, scholarship, or discount details..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Button Text
              </label>
              <input
                value={popupCtaText}
                onChange={(e) => setPopupCtaText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Button Link
              </label>
              <input
                value={popupCtaHref}
                onChange={(e) => setPopupCtaHref(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Optional Banner Image
              </label>
              <label className="mt-1 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#14256f]/50 bg-blue-50/50 px-3 py-2 text-xs font-bold text-[#14256f]">
                <Upload className="h-3.5 w-3.5" />
                {popupImageStoragePath ? "Image Uploaded ✓" : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    void uploadFileToStorage(
                      e.target.files?.[0] ?? null,
                      "landing-popup",
                      (storagePath) => setPopupImageStoragePath(storagePath)
                    )
                  }
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-5 py-2.5 text-xs font-black text-white hover:bg-[#1d348f]"
          >
            Save Popup Settings
          </button>
        </form>
      )}

      {/* TAB 3: 10-YEAR DIGITAL PDF ARCHIVE */}
      {tab === "archive" && (
        <div className="space-y-6">
          <form
            onSubmit={addArchivePdf}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-black text-[#14256f]">
                Upload Free PDF to 10-Year Digital Archive (2016–2026)
              </h2>
              <Link
                href="/resources/archive"
                className="text-xs font-bold text-[#14256f] underline"
              >
                Open Public Archive →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700">
                  PDF Title *
                </label>
                <input
                  required
                  value={archTitle}
                  onChange={(e) => setArchTitle(e.target.value)}
                  placeholder="e.g., Monthly Current Affairs — Nov 2024"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Year *
                </label>
                <select
                  value={archYear}
                  onChange={(e) => setArchYear(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Month *
                </label>
                <select
                  value={archMonth}
                  onChange={(e) => setArchMonth(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Category
                </label>
                <input
                  value={archCategory}
                  onChange={(e) => setArchCategory(e.target.value)}
                  placeholder="Current Affairs / Magazine / PYQs / Notes"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  PDF URL (or Upload Below) *
                </label>
                <input
                  required
                  value={archUrl}
                  onChange={(e) => setArchUrl(e.target.value)}
                  placeholder="Auto-filled on PDF upload"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#14256f]/50 bg-blue-50/50 px-4 py-2.5 text-xs font-black text-[#14256f] hover:bg-blue-50">
                <Upload className="h-4 w-4" />
                Upload PDF File from Computer
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) =>
                    void uploadFileToStorage(
                      e.target.files?.[0] ?? null,
                      "digital-archive",
                      (storagePath, fileName) => {
                        setArchStoragePath(storagePath);
                        setArchUrl(fileName);
                      }
                    )
                  }
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy || !archUrl.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-5 py-2.5 text-xs font-black text-white hover:bg-[#1d348f] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Save to Free Archive
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black text-[#14256f]">
              Archived PDFs ({archiveItems.length})
            </h3>
            <div className="mt-3 divide-y divide-slate-100">
              {archiveItems.map((item) => {
                let meta: any = {};
                try {
                  meta = JSON.parse(item.description || "{}");
                } catch {}
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="ml-2 text-slate-500">
                        ({meta.month} {meta.year} · {meta.category})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteCmsItem(item.id)}
                      className="font-bold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXISTING COURSE & RESOURCE MATERIALS */}
      {tab === "materials" && <CmsContentManager />}
    </div>
  );
}
