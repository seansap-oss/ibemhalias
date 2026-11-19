"use client";

import * as React from "react";
import Link from "next/link";
import { StudentMaterialViewer } from "@/components/student/student-material-viewer";

type Material = {
  id: string;
  course_id: string | null;
  module_id: string | null;
  asset_number: string | null;
  title: string;
  media_type: string;
  locked: boolean;
  media_url: string | null;
  external_url: string | null;
  access_level: string;
};

export function CourseLessons({ courseId, slug }: { courseId: string; slug: string }) {
  const [items, setItems] = React.useState<Material[]>([]);
  const [selected, setSelected] = React.useState<Material | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    fetch(`/api/cms/content?section=${encodeURIComponent(`/courses/${slug}`)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Lessons are temporarily unavailable.");
        return response.json();
      })
      .then((result) => {
        if (active) setItems((result.items || []).filter((item: Material) => item.course_id === courseId));
      })
      .catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [courseId, slug]);

  if (error) return <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>;
  if (!items.length) return null;

  return <>
    <div className="mt-7 space-y-3">
      {items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div><p className="font-bold">{item.title}</p><p className="text-xs text-slate-500">{item.media_type} · {item.asset_number}</p></div>
        {item.locked ? <Link href="/login" className="rounded-lg border px-3 py-2 text-sm font-bold text-indigo-700">Paid access · Sign in</Link> :
          <button type="button" onClick={() => {
            void fetch("/api/activity/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId: item.id, action: "open" }) });
            setSelected(item);
          }} className="rounded-lg bg-[#202b70] px-3 py-2 text-sm font-bold text-white">Watch lesson</button>}
      </div>)}
    </div>
    {selected && <StudentMaterialViewer material={selected} onClose={() => setSelected(null)} onComplete={() => setSelected(null)} />}
  </>;
}
