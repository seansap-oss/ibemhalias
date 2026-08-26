"use client";

import { Download, ExternalLink, X } from "lucide-react";

export function DocumentReader({
  url,
  title,
  kind,
  onClose,
}: {
  url: string;
  title: string;
  kind: "word" | "excel";
  onClose: () => void;
}) {
  const officeUrl =
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950">
      <header className="flex min-h-14 items-center gap-3 border-b border-white/10 bg-slate-950 px-3 text-white sm:px-5">
        <button
          onClick={onClose}
          aria-label="Close document reader"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black">{title}</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {kind === "word" ? "Word document" : "Excel document"} · website reader
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"
          aria-label="Open original document"
          title="Open original document"
        >
          <ExternalLink className="h-5 w-5" />
        </a>

        <a
          href={url}
          download
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"
          aria-label="Download document"
          title="Download document"
        >
          <Download className="h-5 w-5" />
        </a>
      </header>

      <div className="min-h-0 flex-1 bg-[#111827] p-0 sm:p-2">
        <div className="h-full w-full overflow-hidden bg-white sm:rounded-xl">
          <iframe
            title={title}
            src={officeUrl}
            className="h-full w-full border-0"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
