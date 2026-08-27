"use client";

import * as React from "react";
import Link from "next/link";
import {
  Copy,
  Loader2,
  Radio,
  Video,
} from "lucide-react";

export default function TeacherStudioList() {
  const [classes, setClasses] =
    React.useState<any[]>([]);
  const [loading, setLoading] =
    React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetch("/api/live-class/admin?view=overview", {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            payload.error ||
              "Unable to load live classes."
          );
        }
        setClasses(payload.classes || []);
      })
      .catch((err: Error) =>
        setError(err.message)
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[400px] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[.16em] text-[#174699]">
          LIVE MEDIA
        </div>
        <h1 className="mt-1 text-2xl font-black">
          Teacher Live Studio
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Start Live Now, use the teacher camera/mic,
          share the screen, present PDFs, moderate
          students and copy the protected join link.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {classes.map((liveClass) => (
          <div
            key={liveClass.id}
            className="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600">
                <Radio className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black">
                  {liveClass.title}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {liveClass.topic}
                  {liveClass.faculty_name
                    ? ` · ${liveClass.faculty_name}`
                    : ""}
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase text-slate-400">
                  {liveClass.status} ·{" "}
                  {liveClass.assigned_count || 0}{" "}
                  assigned students
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/admin/live-classes/studio/${liveClass.id}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#174699] px-4 text-xs font-black text-white"
              >
                <Video className="h-4 w-4" />
                Open Teacher Studio
              </Link>

              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${window.location.origin}/live-classes/${liveClass.id}`
                  )
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-black"
              >
                <Copy className="h-4 w-4" />
                Copy Student Link
              </button>
            </div>
          </div>
        ))}
      </div>

      {!classes.length ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">
          Create a live class first, then open
          it here.
        </div>
      ) : null}
    </div>
  );
}
