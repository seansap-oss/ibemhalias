"use client";

import { Radio } from "lucide-react";
import { LiveKitTeleclassRoom } from "@/components/live-class/providers/livekit/livekit-teleclass-room";
import { LiveNowDemoRoom } from "@/components/live-class/demo/live-now-demo-room";

/** V5.3.1 Live Now mode. */
export function LiveTeleclassRoom({
  classId,
  mode,
}: {
  classId: string;
  mode: "student" | "teacher";
}) {
  return (
    <div className="relative min-h-screen bg-slate-50">
      {mode === "teacher" ? (
        <div className="sticky top-0 z-[170] border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-5">
          <div className="mx-auto flex max-w-[1600px] items-center gap-2">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-green-50 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-green-700">
              <Radio className="h-3.5 w-3.5" />
              Live Now
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Ibemhal IAS interactive classroom
            </span>
          </div>
        </div>
      ) : null}

      {process.env.NEXT_PUBLIC_LIVE_NOW_DEMO_MODE === "true" ? (
        <LiveNowDemoRoom classId={classId} mode={mode} />
      ) : (
        <LiveKitTeleclassRoom classId={classId} mode={mode} />
      )}
    </div>
  );
}
