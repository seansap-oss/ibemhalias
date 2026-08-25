"use client";

import * as React from "react";
import Link from "next/link";
import { motion, PanInfo } from "framer-motion";
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

const STORAGE_KEY = "ibemhal-floating-whats-new-position";

export function FloatingWhatsNew() {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setPosition(JSON.parse(saved));
    } catch {}
  }, []);

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const next = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    };

    const maxX = Math.max(0, window.innerWidth - (open ? 328 : 76));
    const maxY = Math.max(0, window.innerHeight - (open ? 460 : 150));

    const clamped = {
      x: Math.min(Math.max(next.x, -window.innerWidth + 90), maxX),
      y: Math.min(Math.max(next.y, -window.innerHeight + 170), maxY),
    };

    setPosition(clamped);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
    } catch {}
  };

  if (!mounted) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={onDragEnd}
      style={{ x: position.x, y: position.y }}
      className="fixed right-4 top-[112px] z-[55] lg:hidden"
    >
      {open ? (
        <div className="w-[min(82vw,320px)] overflow-hidden rounded-[24px] border border-red-100 bg-white shadow-2xl shadow-red-950/15">
          <div className="flex items-center justify-between bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <div>
                <div className="text-sm font-black">What&apos;s New</div>
                <div className="text-[10px] font-medium text-white/80">Drag this panel anywhere</div>
              </div>
            </div>

            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setOpen(false)}
              aria-label="Collapse What's New"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            {updates.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                onPointerDown={(event) => event.stopPropagation()}
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
              onPointerDown={(event) => event.stopPropagation()}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-50 text-xs font-black text-red-600"
            >
              View All Updates
            </Link>
          </div>
        </div>
      ) : (
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setOpen(true)}
          aria-label="Open What's New"
          className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-2xl shadow-red-500/30 ring-4 ring-white"
        >
          <Bell className="h-6 w-6" />
        </button>
      )}
    </motion.div>
  );
}
