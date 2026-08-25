"use client";

import { X, Download } from "lucide-react";

export function PdfReader({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950">
      <header className="flex min-h-14 items-center gap-3 border-b border-white/10 bg-slate-950 px-3 text-white sm:px-5">
        <button
          onClick={onClose}
          aria-label="Close PDF reader"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 truncate text-sm font-black">{title}</div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"
          aria-label="Open PDF"
        >
          <Download className="h-5 w-5" />
        </a>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#111827] p-0 sm:p-2">
        <div className="h-full w-full max-w-[1100px] overflow-hidden bg-white sm:rounded-xl">
          <iframe
            title={title}
            src={`${url}#toolbar=1&navpanes=0&view=FitH`}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
