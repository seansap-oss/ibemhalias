"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function OwnerEntry() {
  const router = useRouter();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = React.useState(false);

  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }, []);

  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      router.push("/owner/login");
    }, 5000);
  };

  React.useEffect(() => cancel, [cancel]);

  return (
    <button
      type="button"
      aria-label="Copyright symbol"
      onPointerDown={(event) => { if (event.button === 0 || event.pointerType === "touch") { event.currentTarget.setPointerCapture(event.pointerId); start(); } }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); start(); } }}
      onKeyUp={(event) => { if (event.key === "Enter" || event.key === " ") cancel(); }}
      onContextMenu={(event) => event.preventDefault()}
      className={`relative inline-flex min-h-6 min-w-6 select-none items-center justify-center rounded-md align-middle transition-colors ${holding ? "bg-amber-200 text-[#14256f] ring-2 ring-amber-400" : "hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"}`}
    >
      ©
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 rounded-full bg-amber-500"
        style={{ width: holding ? "100%" : "0%", transition: holding ? "width 5s linear" : "none" }}
      />
    </button>
  );
}
