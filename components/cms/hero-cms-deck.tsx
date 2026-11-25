"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { CmsContentItem } from "@/lib/cms/types";
import { MediaCard } from "./media-card";

export function HeroCmsDeck({
  fallback,
}: {
  fallback: React.ReactNode;
}) {
  const [items, setItems] = React.useState<CmsContentItem[]>([]);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    fetch("/api/cms/content?section=hero")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload) => setItems(payload.items || []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return <>{fallback}</>;

  const current = items[active % items.length];

  const previous = () =>
    setActive((value) => (value - 1 + items.length) % items.length);

  const next = () =>
    setActive((value) => (value + 1) % items.length);

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 shadow-xl shadow-blue-950/10 sm:aspect-[16/10] lg:aspect-[16/9]">
      <MediaCard item={current} hero />

      <button
        onClick={previous}
        aria-label="Previous hero item"
        className="absolute left-4 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-slate-200/80 bg-white/95 text-[#14256f] shadow-md backdrop-blur transition hover:scale-105 hover:bg-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <button
        onClick={next}
        aria-label="Next hero item"
        className="absolute right-4 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-slate-200/80 bg-white/95 text-[#14256f] shadow-md backdrop-blur transition hover:scale-105 hover:bg-white"
      >
        <ArrowRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-full border border-slate-200/60 bg-slate-900/25 px-3 py-2 backdrop-blur-md">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActive(index)}
            aria-label={`Show hero item ${index + 1}`}
            className={[
              "h-2 rounded-full transition-all",
              index === active ? "w-7 bg-white" : "w-2 bg-white/55",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
