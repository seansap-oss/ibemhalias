"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { CmsContentItem } from "@/lib/cms/types";
import { MediaCard } from "./media-card";

export function PageMediaFeed() {
  const pathname = usePathname();
  const [items, setItems] = React.useState<CmsContentItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/cms/content?section=${encodeURIComponent(pathname)}`)
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload) => {
        if (!cancelled) setItems(payload.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-8 border-t border-slate-100 pt-7">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
