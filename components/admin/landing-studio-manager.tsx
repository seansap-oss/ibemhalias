"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Film,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
  Upload,
  Volume2,
  Youtube,
} from "lucide-react";
import { CmsContentManager } from "@/components/admin/cms-content-manager";

type TabId = "hero" | "popup" | "archive" | "materials" | "concierge";

type SupportLead = {
  id: string;
  name: string;
  department: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
};

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

  // Support & AI Voice Concierge state
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [autoGreetOnOpen, setAutoGreetOnOpen] = React.useState(true);
  const [voiceGreeting, setVoiceGreeting] = React.useState("");
  const [busyNotice, setBusyNotice] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState("");
  const [audioStoragePath, setAudioStoragePath] = React.useState<string | null>(null);
  const [salesPhone, setSalesPhone] = React.useState("");
  const [supportPhone, setSupportPhone] = React.useState("");
  const [supportEmail, setSupportEmail] = React.useState("");
  const [whatsappNumber, setWhatsappNumber] = React.useState("");
  const [aiPromptHint, setAiPromptHint] = React.useState("");
  const [supportLeads, setSupportLeads] = React.useState<SupportLead[]>([]);

  const loadAll = React.useCallback(async () => {
    const [h, p, a, c] = await Promise.all([
      fetch("/api/cms/content?section=hero", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch("/api/cms/content?section=landing_popup", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch("/api/cms/content?section=digital_archive", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch("/api/support/concierge?mode=leads", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    setHeroItems(h.items || []);
    setPopupItems(p.items || []);
    setArchiveItems(a.items || []);
    if (c?.config) {
      setVoiceEnabled(c.config.voiceEnabled !== false);
      setAutoGreetOnOpen(c.config.autoGreetOnOpen !== false);
      setVoiceGreeting(c.config.voiceGreeting || "");
      setBusyNotice(c.config.busyNotice || "");
      setAudioUrl(c.config.audioUrl || "");
      setAudioStoragePath(c.config.audioStoragePath || null);
      setSalesPhone(c.config.salesPhone || "");
      setSupportPhone(c.config.supportPhone || "");
      setSupportEmail(c.config.supportEmail || "");
      setWhatsappNumber(c.config.whatsappNumber || "");
      setAiPromptHint(c.config.aiPromptHint || "");
    }
    if (Array.isArray(c?.leads)) {
      setSupportLeads(c.leads);
    }
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

  const saveConcierge = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/support/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          voiceEnabled,
          autoGreetOnOpen,
          voiceGreeting,
          busyNotice,
          audioStoragePath,
          audioUrl,
          salesPhone,
          supportPhone,
          supportEmail,
          whatsappNumber,
          aiPromptHint,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to save Support & AI Voice config");
      setMsg("Support, AI Concierge & Automated Voice settings saved LIVE!");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Failed to save Concierge settings");
    } finally {
      setBusy(false);
    }
  };

  const deleteSupportLead = async (id: string) => {
    await fetch(`/api/support/concierge?id=${encodeURIComponent(id)}`, {
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
            { id: "concierge", label: `5. Support & AI Voice (${supportLeads.length})`, icon: Headphones },
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

      {/* TAB 5: SUPPORT CONCIERGE, AI VOICE & LEADS INBOX */}
      {tab === "concierge" && (
        <div className="space-y-6">
          <form
            onSubmit={saveConcierge}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
                  <Volume2 className="h-5 w-5 text-amber-600" /> Automated Voice & AI Support Settings
                </h2>
                <p className="text-xs text-slate-600">
                  Control the automated voice greeting, busy-line audio recording, Sales/Support phones, and AI Course Advisor shown from the header Contact button & floating Concierge.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#14256f]"
                  />
                  Enable Voice Guide
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoGreetOnOpen}
                    onChange={(e) => setAutoGreetOnOpen(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#14256f]"
                  />
                  Auto-Play When Opened
                </label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Sales & Admissions Phone
                </label>
                <input
                  value={salesPhone}
                  onChange={(e) => setSalesPhone(e.target.value)}
                  placeholder="+91 76290 49230"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Customer Support Phone
                </label>
                <input
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+91 76290 49230"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Official Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="ibemhaliashelpdesk@gmail.com"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">
                  WhatsApp Number (digits only)
                </label>
                <input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="917629049230"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">
                Busy-Hour Banner Notice (shown when lines are busy)
              </label>
              <input
                value={busyNotice}
                onChange={(e) => setBusyNotice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">
                Automated Voice Greeting Script (Spoken aloud automatically if no MP3 is uploaded)
              </label>
              <textarea
                rows={3}
                value={voiceGreeting}
                onChange={(e) => setVoiceGreeting(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-800">
                  Optional Custom Busy/Welcome Audio Recording (.mp3 / .wav)
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                  <Upload className="h-3.5 w-3.5" />
                  {audioStoragePath ? "Audio Uploaded ✓" : "Upload Audio MP3"}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) =>
                      void uploadFileToStorage(
                        e.target.files?.[0] || null,
                        "support-audio",
                        (sp) => setAudioStoragePath(sp)
                      )
                    }
                  />
                </label>
              </div>
              <input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="Or paste external MP3 link (leave blank to use AI voice speech synthesis)"
                className="mt-2.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">
                AI Course Advisor Guidance Prompt
              </label>
              <textarea
                rows={2}
                value={aiPromptHint}
                onChange={(e) => setAiPromptHint(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-5 py-2.5 text-xs font-black text-white hover:bg-[#1d348f] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Support & Voice Settings
            </button>
          </form>

          {/* Callback & Customer Support Leads Inbox */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#14256f]">
                Visitor Callback & Sales/Support Messages ({supportLeads.length})
              </h3>
              <span className="text-xs text-slate-500">
                Submitted from AI Concierge Message Box
              </span>
            </div>

            {supportLeads.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                No visitor callback messages yet. Messages sent when counsellors are busy appear here.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {supportLeads.map((lead) => {
                  const waNum = (lead.phone || "").replace(/[^\d]/g, "");
                  return (
                    <div
                      key={lead.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-[#14256f]">
                            {lead.department}
                          </span>
                          <span className="font-black text-slate-900">{lead.name}</span>
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                            >
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </a>
                          )}
                          {lead.email && (
                            <span className="text-slate-500">{lead.email}</span>
                          )}
                        </div>
                        <p className="text-slate-700">{lead.message}</p>
                        <div className="text-[10px] text-slate-400">
                          {new Date(lead.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {waNum.length >= 10 && (
                          <a
                            href={`https://wa.me/${waNum.length === 10 ? "91" + waNum : waNum}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-green-700"
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteSupportLead(lead.id)}
                          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
