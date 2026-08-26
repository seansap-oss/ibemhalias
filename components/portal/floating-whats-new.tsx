"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarClock,
  FileText,
  Megaphone,
  X,
} from "lucide-react";

const updates = [
  {
    icon: Megaphone,
    title: "New mentorship batch",
    detail: "Admissions and counselling updates",
    href: "/mentorship",
  },
  {
    icon: FileText,
    title: "Daily Current Affairs",
    detail: "Civil Service and SSC/Banking",
    href: "/current-affairs/daily",
  },
  {
    icon: CalendarClock,
    title: "Monthly Current Affairs",
    detail: "Month-wise archive",
    href: "/current-affairs/monthly",
  },
  {
    icon: BookOpen,
    title: "Free Resources",
    detail: "NCERT books, PYQs and solutions",
    href: "/resources",
  },
];

type Point = { x: number; y: number };

const STORAGE_KEY = "ibemhal-floating-whats-new-position-v2";
const EDGE = 10;
const TOP_SAFE = 86;
const BOTTOM_MOBILE = 92;
const BOTTOM_DESKTOP = 12;

function clampPoint(point: Point, width: number, height: number): Point {
  if (typeof window === "undefined") return point;
  const bottom = window.innerWidth < 768 ? BOTTOM_MOBILE : BOTTOM_DESKTOP;
  const maxX = Math.max(EDGE, window.innerWidth - width - EDGE);
  const maxY = Math.max(TOP_SAFE, window.innerHeight - height - bottom);
  return {
    x: Math.min(Math.max(point.x, EDGE), maxX),
    y: Math.min(Math.max(point.y, TOP_SAFE), maxY),
  };
}

export function FloatingWhatsNew() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState<Point>({ x: EDGE, y: 112 });
  const ref = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
    moved: boolean;
  } | null>(null);

  const size = React.useCallback(() => {
    const rect = ref.current?.getBoundingClientRect();
    return {
      width: rect?.width || (open ? 320 : 56),
      height: rect?.height || (open ? 430 : 56),
    };
  }, [open]);

  const save = React.useCallback((point: Point) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(point));
    } catch {}
  }, []);

  const reclamp = React.useCallback(() => {
    const currentSize = size();
    setPosition((current) => {
      const next = clampPoint(current, currentSize.width, currentSize.height);
      save(next);
      return next;
    });
  }, [save, size]);

  React.useEffect(() => {
    setMounted(true);

    const defaultPoint = {
      x: Math.max(EDGE, window.innerWidth - 56 - 16),
      y: 112,
    };

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Point;
        const initial = clampPoint(
          parsed,
          56,
          56
        );
        setPosition(initial);
      } else {
        setPosition(defaultPoint);
      }
    } catch {
      setPosition(defaultPoint);
    }

    const onResize = () => window.requestAnimationFrame(reclamp);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [reclamp]);

  React.useEffect(() => {
    if (!mounted) return;
    const frame = window.requestAnimationFrame(reclamp);
    return () => window.cancelAnimationFrame(frame);
  }, [open, mounted, reclamp]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a,button")) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: position.x,
      startY: position.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const dx = event.clientX - state.pointerX;
    const dy = event.clientY - state.pointerY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.moved = true;

    const currentSize = size();
    setPosition(
      clampPoint(
        { x: state.startX + dx, y: state.startY + dy },
        currentSize.width,
        currentSize.height
      )
    );
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const currentSize = size();
    const next = clampPoint(position, currentSize.width, currentSize.height);
    setPosition(next);
    save(next);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    dragRef.current = null;
  };

  const resetPosition = () => {
    const currentSize = size();
    const next = clampPoint(
      {
        x: window.innerWidth - currentSize.width - 16,
        y: 112,
      },
      currentSize.width,
      currentSize.height
    );
    setPosition(next);
    save(next);
  };

  if (!mounted) return null;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onDoubleClick={resetPosition}
      style={{ left: position.x, top: position.y }}
      className="fixed z-[55] touch-none select-none lg:hidden"
    >
      {open ? (
        <div className="w-[min(82vw,320px)] overflow-hidden rounded-[24px] border border-red-100 bg-white shadow-2xl shadow-red-950/15">
          <div className="cursor-grab bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 text-white active:cursor-grabbing">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <div>
                  <div className="text-sm font-black">What&apos;s New</div>
                  <div className="text-[10px] font-medium text-white/80">
                    Drag the orange header · stays inside screen
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Collapse What's New"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            {updates.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-50"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-500">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black leading-snug text-slate-900">
                    {item.title}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-500">
                    {item.detail}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 p-3">
            <Link
              href="/current-affairs/daily"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-50 text-xs font-black text-red-600"
            >
              View All Updates
            </Link>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open What's New"
          title="What's New · drag around the screen · double-click to reset"
          className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-2xl shadow-red-500/30 ring-4 ring-white"
        >
          <Bell className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
