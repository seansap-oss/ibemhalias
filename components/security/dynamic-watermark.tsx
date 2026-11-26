"use client";

import * as React from "react";

const POSITIONS = [
  "translate-x-0 translate-y-0",
  "translate-x-6 -translate-y-4",
  "-translate-x-6 translate-y-4",
  "translate-x-4 translate-y-6",
];

export function DynamicWatermark({
  label,
  lightText = false,
}: {
  label?: string;
  lightText?: boolean;
}) {
  const [posIndex, setPosIndex] = React.useState(0);

  React.useEffect(() => {
    if (!label) return;
    const id = window.setInterval(() => {
      setPosIndex((i) => (i + 1) % POSITIONS.length);
    }, 20_000);
    return () => window.clearInterval(id);
  }, [label]);

  if (!label) return null;

  const textClass = lightText
    ? "text-white/[0.16] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
    : "text-slate-900/[0.13]";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-30 select-none overflow-hidden transition-transform duration-1000 ${POSITIONS[posIndex]}`}
    >
      <div className="grid h-full w-full -rotate-12 scale-125 grid-cols-2 place-items-center gap-10 p-6 sm:grid-cols-3">
        {Array.from({ length: 9 }).map((_, idx) => (
          <span
            key={idx}
            className={`whitespace-nowrap text-[11px] font-black tracking-wider sm:text-xs ${textClass}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
