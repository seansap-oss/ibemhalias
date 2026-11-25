"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import {
  DEFAULT_EXAMS,
  GALLERY_YEARS,
  type AchieverItem,
  type SpotlightRank,
} from "@/lib/gallery/achievers-data";

export default function AdminAchieversPage() {
  const [items, setItems] = React.useState<AchieverItem[]>([]);
  const [exams, setExams] = React.useState<string[]>(DEFAULT_EXAMS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [cardType, setCardType] = React.useState<"topper" | "poster">("topper");
  const [spotlightRank, setSpotlightRank] = React.useState<SpotlightRank>("none");
  const [title, setTitle] = React.useState("");
  const [year, setYear] = React.useState<number>(2026);
  const [examCategory, setExamCategory] = React.useState<string>("UPSC CSE");
  const [rankBadge, setRankBadge] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [highlights, setHighlights] = React.useState("");
  const [story, setStory] = React.useState("");

  const [newExamName, setNewExamName] = React.useState("");
  const [addingExam, setAddingExam] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/achievers", { cache: "no-store" });
      const data = await res.json();
      if (data?.items) setItems(data.items);
      if (Array.isArray(data?.exams) && data.exams.length) {
        setExams(data.exams);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/achievers/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Photo upload failed");
      }
      setImageUrl(data.url);
    } catch (err: any) {
      setError(err?.message || "Unable to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleAddExam = async () => {
    const trimmed = newExamName.trim();
    if (!trimmed) return;
    setAddingExam(true);
    setError("");
    try {
      const res = await fetch("/api/achievers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_exam", examName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Unable to add exam");
      }
      setExams((prev) => Array.from(new Set([...prev, trimmed])));
      setExamCategory(trimmed);
      setNewExamName("");
      setSuccess(`Added exam "${trimmed}" to the dropdown!`);
    } catch (err: any) {
      setError(err?.message || "Unable to add exam");
    } finally {
      setAddingExam(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCardType("topper");
    setSpotlightRank("none");
    setTitle("");
    setYear(2026);
    setRankBadge("");
    setSubtitle("");
    setImageUrl("");
    setHighlights("");
    setStory("");
  };

  const startEdit = (item: AchieverItem) => {
    setEditingId(item.id);
    setCardType(item.cardType === "topper" ? "topper" : "poster");
    setSpotlightRank(item.spotlightRank || "none");
    setTitle(item.title);
    setYear(item.year);
    setExamCategory(item.examCategory);
    setRankBadge(item.rankBadge || "");
    setSubtitle(item.subtitle || "");
    setImageUrl(item.imageUrl);
    setHighlights((item.highlights || []).join("\n"));
    setStory(item.story || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch("/api/achievers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          cardType,
          spotlightRank,
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
      setSuccess(
        editingId
          ? "Updated Hall of Fame entry!"
          : "Added to Hall of Fame Gallery!"
      );
      resetForm();
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
    if (res.ok) {
      if (editingId === id) resetForm();
      await load();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">
            Hall of Fame &amp; Alumni Gallery Manager
          </h1>
          <p className="text-sm text-slate-500">
            Upload single &ldquo;Top of the Class&rdquo; candidates or group
            result posters, and add custom exams &amp; years anytime.
          </p>
        </div>
        <Link
          href="/achievers"
          className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1d348f]"
        >
          View Public Gallery <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Add / Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-black text-[#14256f]">
            <ImagePlus className="h-4 w-4" />
            {editingId ? "Edit Gallery Entry" : "Add New Achiever or Poster"}
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Card Type Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700">
            Entry Style
          </label>
          <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCardType("topper")}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                cardType === "topper"
                  ? "border-amber-400 bg-amber-50/80 ring-2 ring-amber-300/50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">
                  Single Candidate (Top of the Class)
                </div>
                <div className="text-[11px] text-slate-500">
                  Portrait card with Rank/AIR badge &amp; personal quote
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCardType("poster")}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                cardType === "poster"
                  ? "border-[#14256f] bg-blue-50/70 ring-2 ring-[#14256f]/20"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-[#14256f]">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">
                  Group / Result Poster
                </div>
                <div className="text-[11px] text-slate-500">
                  Celebration banner or multi-candidate list poster
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Title, Year, Exam */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700">
              {cardType === "topper"
                ? "Student Full Name *"
                : "Poster / Batch Title *"}
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                cardType === "topper"
                  ? "e.g., Wahengbam Renudhar"
                  : "e.g., UPSC CSE 2026 Successful Candidates"
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Selection Year *
            </label>
            <input
              type="number"
              min={2015}
              max={2035}
              required
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              list="gallery-years-list"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <datalist id="gallery-years-list">
              {[2027, ...GALLERY_YEARS].map((y) => (
                <option key={y} value={y} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Exam Dropdown + Add New Exam */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Exam Name *
            </label>
            <select
              value={examCategory}
              onChange={(e) => setExamCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {exams.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700">
              Add a New Exam to Dropdown (Optional)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="e.g., Manipur Police SI, UGC NET, CDS, NDA..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={addingExam || !newExamName.trim()}
                onClick={handleAddExam}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#14256f] bg-blue-50 px-3.5 py-2 text-xs font-black text-[#14256f] hover:bg-blue-100 disabled:opacity-50"
              >
                {addingExam ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add Exam
              </button>
            </div>
          </div>
        </div>

        {/* Photo Upload + URL */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Upload Photo from Computer *
            </label>
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#14256f]/50 bg-blue-50/50 px-4 py-2.5 text-xs font-black text-[#14256f] hover:bg-blue-50">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Choose Photo / Poster"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) =>
                    void handleFileUpload(e.target.files?.[0] ?? null)
                  }
                />
              </label>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Or Paste Photo URL
            </label>
            <input
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Auto-filled on upload, or paste https://..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Rank, Spotlight & Subtitle */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-700">
              5s Celebration Spotlight
            </label>
            <select
              value={spotlightRank}
              onChange={(e) => setSpotlightRank(e.target.value as SpotlightRank)}
              className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              <option value="none">None (Gallery Only)</option>
              <option value="rank_1">Winner #1 (Gold Crown)</option>
              <option value="rank_2">Winner #2</option>
              <option value="rank_3">Winner #3</option>
              <option value="group_latest">Latest Group Celebration Photo</option>
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
              Programme / District Subtitle
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., GS Foundation + Interview Guidance"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Story & Highlights */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700">
              {cardType === "topper"
                ? "Student Quote / Success Story"
                : "Batch / Result Description"}
            </label>
            <textarea
              rows={3}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Share how this student or batch achieved success..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Additional Highlights (one per line, optional)
            </label>
            <textarea
              rows={3}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="Candidate Name — Rank / Post"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1d348f] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trophy className="h-4 w-4" />
          )}
          {editingId ? "Save Changes" : "Publish to Hall of Fame"}
        </button>
      </form>

      {/* Published Gallery Items */}
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
              <div className="relative aspect-[4/3] bg-slate-100">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover object-top"
                />
                {item.cardType === "topper" && (
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow">
                    <Star className="h-3 w-3" /> Top of Class
                  </span>
                )}
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
                {item.rankBadge && (
                  <div className="mt-0.5 text-[11px] font-semibold text-[#14256f]">
                    {item.rankBadge}
                  </div>
                )}
                {!item.isSeed && (
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#14256f] hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
