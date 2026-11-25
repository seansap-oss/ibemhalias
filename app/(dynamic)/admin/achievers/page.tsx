"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExternalLink,
  ImagePlus,
  Loader2,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  EXAM_CATEGORIES,
  GALLERY_YEARS,
  type AchieverItem,
  type ExamCategory,
} from "@/lib/gallery/achievers-data";

export default function AdminAchieversPage() {
  const [items, setItems] = React.useState<AchieverItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const [title, setTitle] = React.useState("");
  const [year, setYear] = React.useState<number>(2026);
  const [examCategory, setExamCategory] =
    React.useState<ExamCategory>("UPSC CSE");
  const [rankBadge, setRankBadge] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [highlights, setHighlights] = React.useState("");
  const [story, setStory] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/achievers", { cache: "no-store" });
      const data = await res.json();
      if (data?.items) setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/achievers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          year,
          examCategory,
          rankBadge,
          subtitle,
          imageUrl,
          highlights,
          story,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Unable to save achiever");
      }
      setSuccess("Added to Hall of Fame Gallery!");
      setTitle("");
      setRankBadge("");
      setSubtitle("");
      setImageUrl("");
      setHighlights("");
      setStory("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to save achiever");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/achievers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) await load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">
            Hall of Fame &amp; Alumni Gallery Manager
          </h1>
          <p className="text-sm text-slate-500">
            Add successful candidate photos, rank posters, and alumni stories
            categorized by year (2020–2026+).
          </p>
        </div>
        <Link
          href="/achievers"
          className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1d348f]"
        >
          View Public Gallery <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-black text-[#14256f]">
          <ImagePlus className="h-4 w-4" />
          Add New Achiever / Poster
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700">
              Candidate Name or Poster Title *
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., UPSC CSE 2026 Toppers or Wahengbam Renudhar"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Selection Year *
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {[2027, ...GALLERY_YEARS].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Exam Category *
            </label>
            <select
              value={examCategory}
              onChange={(e) => setExamCategory(e.target.value as ExamCategory)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {EXAM_CATEGORIES.filter((c) => c !== "All Exams").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Rank / Post Badge
            </label>
            <input
              value={rankBadge}
              onChange={(e) => setRankBadge(e.target.value)}
              placeholder="e.g., AIR 142 · IAS or Rank 1 MCS"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Photo / Poster URL *
            </label>
            <input
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... or /gallery/..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Short Subtitle
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., Interview Guidance & GS Foundation Batch"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Candidate Highlights (one per line)
            </label>
            <textarea
              rows={2}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="Name — Rank / Post"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">
            Inspiring Story / Message
          </label>
          <textarea
            rows={2}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Share how this student/batch achieved success..."
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1d348f] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trophy className="h-4 w-4" />
          )}
          Add to Gallery
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-[#14256f]">
          Published Gallery Items ({loading ? "…" : items.length})
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200"
            >
              <div className="aspect-[4/3] bg-slate-100">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-center justify-between gap-2 text-[10px] font-black">
                  <span className="rounded bg-[#14256f] px-2 py-0.5 text-white">
                    {item.year}
                  </span>
                  <span className="text-amber-800">{item.examCategory}</span>
                </div>
                <div className="mt-2 text-xs font-bold text-slate-900">
                  {item.title}
                </div>
                {!item.isSeed && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-bold text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
