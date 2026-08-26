"use client";

import * as React from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileType2,
  Image as ImageIcon,
  LockKeyhole,
  X,
} from "lucide-react";
import { getYouTubeEmbedUrl } from "@/lib/cms/media";
import { SITE_CONTACT } from "@/lib/site-contact";

type Material = Record<string, any>;

export function StudentMaterialViewer({
  material,
  onClose,
  onComplete,
}: {
  material: Material;
  onClose: () => void;
  onComplete: () => void;
}) {
  const url = material.media_url || material.external_url || "";
  const youtube =
    material.media_type === "youtube" && material.external_url
      ? getYouTubeEmbedUrl(material.external_url)
      : null;

  if (material.locked) {
    return (
      <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-[28px] bg-white p-7 text-center shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-950">{material.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            This is premium study material and is not included in your current access.
          </p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
            Contact Help Desk for access: {SITE_CONTACT.helpdeskEmail}
          </div>
          <button onClick={onClose} className="mt-5 min-h-11 w-full rounded-xl bg-[#14256f] px-4 text-sm font-black text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  const officeUrl =
    (material.media_type === "word" || material.media_type === "excel") && url
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
      : "";

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-slate-950">
      <header className="flex min-h-16 items-center gap-3 border-b border-white/10 bg-[#07143f] px-3 text-white sm:px-5">
        <button onClick={onClose} aria-label="Close material" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/15">
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black">{material.title}</div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200">
            {material.media_type} · {material.access_level === "premium" ? "Premium" : "Free"}
          </div>
        </div>
        <button onClick={onComplete} className="hidden min-h-10 items-center gap-2 rounded-xl bg-green-600 px-3 text-xs font-black text-white sm:inline-flex">
          <CheckCircle2 className="h-4 w-4" /> Mark Complete
        </button>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10" title="Open original">
            <ExternalLink className="h-5 w-5" />
          </a>
        ) : null}
        {url ? (
          <a href={url} download className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10" title="Download">
            <Download className="h-5 w-5" />
          </a>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 bg-[#111827]">
        {material.media_type === "pdf" && url ? (
          <iframe title={material.title} src={`${url}#toolbar=1&navpanes=0&view=FitH`} className="h-full w-full border-0 bg-white" />
        ) : null}

        {material.media_type === "video" && url ? (
          <div className="grid h-full place-items-center p-3">
            <video src={url} controls playsInline autoPlay preload="metadata" className="max-h-full w-full max-w-6xl rounded-xl bg-black" />
          </div>
        ) : null}

        {material.media_type === "youtube" && youtube ? (
          <div className="grid h-full place-items-center p-3">
            <iframe src={youtube} title={material.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="aspect-video w-full max-w-6xl rounded-xl border-0 bg-black" />
          </div>
        ) : null}

        {material.media_type === "audio" && url ? (
          <div className="grid h-full place-items-center p-6">
            <div className="w-full max-w-xl rounded-[28px] bg-white p-7 text-center shadow-2xl">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><FileAudio className="h-8 w-8" /></div>
              <h2 className="mt-4 text-lg font-black text-slate-950">{material.title}</h2>
              <audio src={url} controls autoPlay className="mt-5 w-full" />
            </div>
          </div>
        ) : null}

        {material.media_type === "image" && url ? (
          <div className="grid h-full place-items-center overflow-auto p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={material.title} className="max-h-full max-w-full rounded-xl bg-white object-contain" />
          </div>
        ) : null}

        {(material.media_type === "word" || material.media_type === "excel") && officeUrl ? (
          <iframe title={material.title} src={officeUrl} className="h-full w-full border-0 bg-white" allowFullScreen />
        ) : null}

        {material.media_type === "file" ? (
          <div className="grid h-full place-items-center p-6">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-7 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><FileText className="h-8 w-8" /></div>
              <h2 className="mt-4 text-lg font-black text-slate-950">{material.title}</h2>
              <p className="mt-2 text-sm text-slate-500">This file opens using the browser or your device application.</p>
              {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#14256f] px-5 text-sm font-black text-white"><Download className="h-4 w-4" /> Open / Download</a> : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 bg-[#07143f] p-3 sm:hidden">
        <button onClick={onComplete} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-black text-white">
          <CheckCircle2 className="h-4 w-4" /> Mark Complete
        </button>
      </div>
    </div>
  );
}
