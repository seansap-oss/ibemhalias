"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BookOpen, CalendarClock, FileText, Megaphone, X } from "lucide-react";

const updates = [
  { icon: Megaphone, title: "New mentorship batch", detail: "Admissions and counselling updates", href: "/mentorship" },
  { icon: FileText, title: "Daily Current Affairs", detail: "Civil Service and SSC/Banking", href: "/current-affairs/daily" },
  { icon: CalendarClock, title: "Monthly Current Affairs", detail: "Month-wise archive", href: "/current-affairs/monthly" },
  { icon: BookOpen, title: "Free Resources", detail: "NCERT books, PYQs and solutions", href: "/resources" },
];

type Side = "left" | "right";
type DockState = { side: Side; y: number };

const STORAGE_KEY = "ibemhal-floating-whats-new-dock-v3";
const LEGACY_STORAGE_KEY = "ibemhal-floating-whats-new-position-v2";
const EDGE = 12;
const TOP_SAFE = 86;

function bottomSafe() {
  if (typeof window === "undefined") return 96;
  return window.innerWidth < 768 ? 88 : 16;
}

function panelWidth(open: boolean) {
  if (typeof window === "undefined") return open ? 320 : 56;
  return open ? Math.min(window.innerWidth * 0.86, 320) : 56;
}

function panelHeight(open: boolean) {
  return open ? 430 : 56;
}

function clampY(y: number, open: boolean) {
  if (typeof window === "undefined") return y;
  const maxY = Math.max(TOP_SAFE, window.innerHeight - panelHeight(open) - bottomSafe());
  return Math.min(Math.max(Number.isFinite(y) ? y : TOP_SAFE, TOP_SAFE), maxY);
}

function defaultDock(): DockState {
  return { side: "right", y: 112 };
}

function readDock(): DockState {
  const fallback = defaultDock();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DockState>;
      return { side: parsed.side === "left" ? "left" : "right", y: clampY(Number(parsed.y), false) };
    }
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { x?: number; y?: number };
      const side: Side = Number(parsed.x) < window.innerWidth / 2 ? "left" : "right";
      return { side, y: clampY(Number(parsed.y), false) };
    }
  } catch {}
  return fallback;
}

export function FloatingWhatsNew() {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [dock, setDock] = React.useState<DockState>(defaultDock());
  const drag = React.useRef<{
    pointerId: number;
    pointerY: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const save = React.useCallback((next: DockState) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  React.useEffect(() => {
    setMounted(true);
    const initial = readDock();
    setDock(initial);
    save(initial);

    const reclamp = () => {
      setDock((current) => {
        const next = { ...current, y: clampY(current.y, open) };
        save(next);
        return next;
      });
    };

    window.addEventListener("resize", reclamp);
    window.addEventListener("orientationchange", reclamp);
    return () => {
      window.removeEventListener("resize", reclamp);
      window.removeEventListener("orientationchange", reclamp);
    };
  }, [open, save]);

  React.useEffect(() => {
    if (!mounted) return;
    setDock((current) => {
      const next = { ...current, y: clampY(current.y, open) };
      save(next);
      return next;
    });
  }, [open, mounted, save]);

  const beginDrag = (event: React.PointerEvent<HTMLButtonElement | HTMLDivElement>) => {
    drag.current = {
      pointerId: event.pointerId,
      pointerY: event.clientY,
      startY: dock.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement | HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dy = event.clientY - state.pointerY;
    if (Math.abs(dy) > 3) state.moved = true;
    setDock((current) => ({ ...current, y: clampY(state.startY + dy, open) }));
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement | HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const side: Side = event.clientX < window.innerWidth / 2 ? "left" : "right";
    setDock((current) => {
      const next = { side, y: clampY(current.y, open) };
      save(next);
      return next;
    });

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}

    const moved = state.moved;
    drag.current = null;
    if (!moved && !open) setOpen(true);
  };

  const sideStyle: React.CSSProperties =
    dock.side === "left" ? { left: EDGE, top: dock.y } : { right: EDGE, top: dock.y };

  if (!mounted) return null;

  return (
    <div
      style={sideStyle}
      className="fixed z-[95] touch-none select-none lg:hidden"
      data-floating-whats-new-dock={dock.side}
    >
      {open ? (
        <div
          style={{ width: panelWidth(true) }}
          className="overflow-hidden rounded-[24px] border border-red-100 bg-white shadow-2xl shadow-red-950/15"
        >
          <div
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            className="touch-none cursor-grab bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 text-white active:cursor-grabbing"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <div>
                  <div className="text-sm font-black">What&apos;s New</div>
                  <div className="text-[10px] font-medium text-white/80">
                    Drag header to move · release left or right
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Collapse What's New"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            {updates.map((item) => (
              <Link key={item.title} href={item.href} className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-500">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black leading-snug text-slate-900">{item.title}</div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-500">{item.detail}</div>
                </div>
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 p-3">
            <Link href="/current-affairs/daily" className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-50 text-xs font-black text-red-600">
              View All Updates
            </Link>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          aria-label="Open or move What's New"
          title="Tap to open. Drag vertically and release on the left or right."
          className="grid h-14 w-14 touch-none place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-2xl shadow-red-500/30 ring-4 ring-white"
        >
          <Bell className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
