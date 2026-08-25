"use client";

import * as React from "react";
import {
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileType2,
  Play,
  Download,
} from "lucide-react";
import type { CmsContentItem } from "@/lib/cms/types";
import { formatFileSize, getYouTubeEmbedUrl } from "@/lib/cms/media";
import { PdfReader } from "./pdf-reader";

export function MediaCard({
  item,
  hero = false,
}: {
  item: CmsContentItem;
  hero?: boolean;
}) {
  const [readingPdf, setReadingPdf] = React.useState(false);

  const url = item.media_url || item.external_url || "";
  const embedUrl =
    item.media_type === "youtube" && item.external_url
      ? getYouTubeEmbedUrl(item.external_url)
      : null;

  const cardClass = hero
    ? "h-full w-full overflow-hidden rounded-[28px] bg-slate-950"
    : "overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm";

  return (
    <>
      <article className={cardClass}>
        {item.media_type === "image" && url && (
          <div className={hero ? "h-full w-full bg-slate-950" : "aspect-[16/10] bg-slate-50"}>
            <img
              src={url}
              alt={item.title}
              className="h-full w-full object-contain object-center"
            />
          </div>
        )}

        {item.media_type === "video" && url && (
          <div className={hero ? "h-full w-full bg-black" : "aspect-video bg-black"}>
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain object-center"
            />
          </div>
        )}

        {item.media_type === "youtube" && embedUrl && (
          <div className={hero ? "h-full w-full bg-black" : "aspect-video bg-black"}>
            <iframe
              src={embedUrl}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        )}

        {item.media_type === "pdf" && (
          <button
            onClick={() => setReadingPdf(true)}
            className={[
              "flex w-full flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-slate-50 text-center",
              hero ? "h-full p-8" : "aspect-[16/10] p-6",
            ].join(" ")}
          >
            <div className="grid h-20 w-20 place-items-center rounded-[22px] bg-red-500 text-white shadow-xl shadow-red-200">
              <FileText className="h-10 w-10" />
            </div>
            <div className="mt-5 max-w-md text-xl font-black text-slate-950">
              {item.title}
            </div>
            <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-red-600">
              PDF · Tap to Read
            </div>
          </button>
        )}

        {item.media_type === "audio" && (
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileAudio className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-black text-slate-950">{item.title}</div>
                <div className="text-xs text-slate-500">{formatFileSize(item.file_size)}</div>
              </div>
            </div>
            {url && <audio src={url} controls className="mt-4 w-full" />}
          </div>
        )}

        {["word", "excel", "file"].includes(item.media_type) && (
          <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              {item.media_type === "excel" ? (
                <FileSpreadsheet className="h-8 w-8" />
              ) : item.media_type === "word" ? (
                <FileType2 className="h-8 w-8" />
              ) : (
                <FileText className="h-8 w-8" />
              )}
            </div>
            <div className="mt-4 font-black text-slate-950">{item.title}</div>
            <div className="mt-1 text-xs text-slate-500">{formatFileSize(item.file_size)}</div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white"
              >
                <Download className="h-4 w-4" />
                Open / Download
              </a>
            )}
          </div>
        )}

        {!hero && !["pdf", "audio", "word", "excel", "file"].includes(item.media_type) && (
          <div className="p-4">
            <h3 className="text-base font-black text-slate-950">{item.title}</h3>
            {item.description && (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
            )}
          </div>
        )}
      </article>

      {readingPdf && url && (
        <PdfReader url={url} title={item.title} onClose={() => setReadingPdf(false)} />
      )}
    </>
  );
}
