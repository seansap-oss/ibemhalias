"use client";

import * as React from "react";
import {
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileType2,
  Image,
  Link2,
  Loader2,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import { CMS_SECTIONS, CMS_SECTION_GROUPS } from "@/lib/cms/sections";
import type { CmsContentItem, CmsMediaType } from "@/lib/cms/types";
import {
  inferMediaType,
  formatFileSize,
  getYouTubeEmbedUrl,
} from "@/lib/cms/media";

type UploadMode = "file" | "youtube";

async function readJson(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text || `${response.status} ${response.statusText}`,
    };
  }
}

export function CmsContentManager() {
  const [section, setSection] = React.useState("hero");
  const [items, setItems] = React.useState<CmsContentItem[]>([]);
  const [mode, setMode] = React.useState<UploadMode>("file");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dateLabel, setDateLabel] = React.useState("");
  const [monthLabel, setMonthLabel] = React.useState("");
  const [youtubeUrl, setYoutubeUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const loadItems = React.useCallback(async () => {
    setLoadingItems(true);

    try {
      const response = await fetch(
        `/api/cms/content?section=${encodeURIComponent(section)}`,
        { cache: "no-store" }
      );

      const payload = await readJson(response);

      if (!response.ok) {
        throw new Error(
          [
            payload.error,
            payload.code ? `Code: ${payload.code}` : "",
            payload.details || "",
            payload.hint || "",
          ]
            .filter(Boolean)
            .join(" · ")
        );
      }

      setItems(payload.items || []);
      setMessage("");
    } catch (error: any) {
      setItems([]);
      setMessage(
        `CMS connection error: ${error?.message || "Unable to load content"}`
      );
    } finally {
      setLoadingItems(false);
    }
  }, [section]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDateLabel("");
    setMonthLabel("");
    setYoutubeUrl("");
    setFile(null);
  };

  const publish = async () => {
    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter a student-facing title.");
      return;
    }

    if (mode === "youtube") {
      if (!getYouTubeEmbedUrl(youtubeUrl)) {
        setMessage("Enter a valid YouTube URL.");
        return;
      }
    } else if (!file) {
      setMessage("Choose a file to upload.");
      return;
    }

    setPublishing(true);

    try {
      let mediaType: CmsMediaType = "youtube";
      let storageResult: any = {};

      if (mode === "file" && file) {
        mediaType = inferMediaType(file);

        const form = new FormData();
        form.set("file", file);
        form.set("section_path", section);

        const uploadResponse = await fetch("/api/cms/upload", {
          method: "POST",
          body: form,
        });

        const uploadPayload = await readJson(uploadResponse);

        if (!uploadResponse.ok) {
          throw new Error(
            uploadPayload.error || "Upload failed"
          );
        }

        storageResult = uploadPayload;
      }

      const createResponse = await fetch("/api/cms/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_path: section,
          title: title.trim(),
          description: description.trim() || null,
          media_type: mediaType,
          mime_type: storageResult.mime_type || null,
          file_name: storageResult.file_name || null,
          file_size: storageResult.file_size || null,
          storage_path: storageResult.storage_path || null,
          external_url:
            mode === "youtube" ? youtubeUrl.trim() : null,
          date_label: dateLabel.trim() || null,
          month_label: monthLabel.trim() || null,
          is_published: true,
        }),
      });

      const createPayload = await readJson(createResponse);

      if (!createResponse.ok) {
        throw new Error(
          [
            createPayload.error,
            createPayload.code
              ? `Code: ${createPayload.code}`
              : "",
            createPayload.details || "",
            createPayload.hint || "",
          ]
            .filter(Boolean)
            .join(" · ")
        );
      }

      reset();
      setMessage("Published successfully.");
      await loadItems();
    } catch (error: any) {
      setMessage(
        `Publish failed: ${error?.message || "Unable to publish."}`
      );
    } finally {
      setPublishing(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this content item?")) return;

    const response = await fetch(`/api/cms/content/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      await loadItems();
    } else {
      const payload = await readJson(response);
      setMessage(
        `Delete failed: ${payload.error || response.statusText}`
      );
    }
  };

  const iconFor = (type: CmsMediaType) => {
    if (type === "image") return Image;
    if (type === "pdf") return FileText;
    if (type === "video" || type === "youtube") return Video;
    if (type === "audio") return FileAudio;
    if (type === "excel") return FileSpreadsheet;
    if (type === "word") return FileType2;
    return FileText;
  };

  return (
    <div className="grid min-h-[720px] gap-5 xl:grid-cols-[260px_1fr_390px]">
      <aside className="rounded-[26px] bg-gradient-to-b from-[#14256f] to-[#0d225f] p-3 text-white">
        <div className="px-3 py-3 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
          Website Structure
        </div>

        <div className="max-h-[660px] space-y-4 overflow-y-auto pr-1">
          {CMS_SECTION_GROUPS.map((group) => (
            <div key={group}>
              <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                {group}
              </div>

              <div className="space-y-1">
                {CMS_SECTIONS.filter(
                  (item) => item.group === group
                ).map((item) => (
                  <button
                    key={item.path}
                    onClick={() => setSection(item.path)}
                    className={[
                      "w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold leading-snug transition",
                      section === item.path
                        ? "bg-white text-[#14256f]"
                        : "bg-white/8 text-white hover:bg-white/12",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">
            Selected Section
          </div>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {CMS_SECTIONS.find(
              (item) => item.path === section
            )?.label || section}
          </h2>

          <p className="mt-1 break-all text-xs text-slate-500">
            {section}
          </p>
        </div>

        {message && (
          <div
            className={[
              "mt-4 rounded-2xl border p-4 text-sm font-bold",
              message.includes("success")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {message}
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-black text-slate-950">
              Published Content
            </h3>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              {loadingItems ? "Loading..." : `${items.length} items`}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {!loadingItems && items.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No published content in this section yet.
              </div>
            )}

            {items.map((item) => {
              const Icon = iconFor(item.media_type);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-900">
                      {item.title}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span className="uppercase">
                        {item.media_type}
                      </span>

                      {!!item.file_size && (
                        <span>{formatFileSize(item.file_size)}</span>
                      )}

                      {!!item.date_label && (
                        <span>{item.date_label}</span>
                      )}

                      {!!item.month_label && (
                        <span>{item.month_label}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => remove(item.id)}
                    aria-label="Delete item"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">
          Upload / Publish
        </h3>

        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Files and YouTube links publish to the selected website section.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setMode("file")}
            className={[
              "rounded-xl px-3 py-2 text-xs font-black",
              mode === "file"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500",
            ].join(" ")}
          >
            Upload File
          </button>

          <button
            onClick={() => setMode("youtube")}
            className={[
              "rounded-xl px-3 py-2 text-xs font-black",
              mode === "youtube"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500",
            ].join(" ")}
          >
            YouTube URL
          </button>
        </div>

        <label className="mt-5 block text-xs font-black text-slate-700">
          Student-facing Title / Label
        </label>

        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          placeholder="e.g. NCERT Geography Class 11"
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
        />

        <label className="mt-4 block text-xs font-black text-slate-700">
          Description
        </label>

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Optional description"
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-700">
              Date Label
            </label>

            <input
              value={dateLabel}
              onChange={(event) =>
                setDateLabel(event.target.value)
              }
              placeholder="26 August"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700">
              Month Label
            </label>

            <input
              value={monthLabel}
              onChange={(event) =>
                setMonthLabel(event.target.value)
              }
              placeholder="August"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
        </div>

        {mode === "file" ? (
          <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-center">
            <UploadCloud className="h-8 w-8 text-indigo-600" />

            <div className="mt-3 text-sm font-black text-slate-900">
              {file
                ? file.name
                : "Tap or click to choose file"}
            </div>

            <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
              PDF, Word, Excel, MP3/audio, MP4/video, JPG, PNG, WebP
            </div>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.mp3,.wav,.m4a,.mp4,.mov,.webm,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={(event) =>
                setFile(event.target.files?.[0] || null)
              }
            />
          </label>
        ) : (
          <div className="mt-5">
            <label className="block text-xs font-black text-slate-700">
              YouTube URL
            </label>

            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
              <Link2 className="h-4 w-4 shrink-0 text-indigo-600" />

              <input
                value={youtubeUrl}
                onChange={(event) =>
                  setYoutubeUrl(event.target.value)
                }
                placeholder="https://youtube.com/watch?v=..."
                className="min-h-11 min-w-0 flex-1 text-sm outline-none"
              />
            </div>
          </div>
        )}

        <button
          disabled={publishing}
          onClick={publish}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#14256f] px-4 text-sm font-black text-white shadow-lg disabled:opacity-50"
        >
          {publishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}

          {publishing
            ? "Publishing..."
            : "Publish Content"}
        </button>
      </aside>
    </div>
  );
}
