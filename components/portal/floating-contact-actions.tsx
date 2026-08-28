"use client";

import * as React from "react";
import { GripVertical, MessageCircle, Phone } from "lucide-react";
import { SITE_CONTACT, SITE_WHATSAPP_HREF } from "@/lib/site-contact";

type Side = "left" | "right";
type DockState = { side: Side; y: number };

const BUTTON_SIZE = 50;
const GAP = 10;
const HANDLE_HEIGHT = 28;
const RAIL_HEIGHT = BUTTON_SIZE * 2 + GAP + HANDLE_HEIGHT;
const EDGE = 12;
const TOP_SAFE = 86;
const STORAGE_KEY = "ibemhal-contact-dock-v5";

function bottomSafe() {
  if (typeof window === "undefined") return 96;
  return window.innerWidth < 768 ? 88 : 18;
}

function clampY(y: number) {
  if (typeof window === "undefined") return y;
  const maxY = Math.max(TOP_SAFE, window.innerHeight - RAIL_HEIGHT - bottomSafe());
  return Math.min(Math.max(Number.isFinite(y) ? y : TOP_SAFE, TOP_SAFE), maxY);
}

function defaultState(): DockState {
  if (typeof window === "undefined") return { side: "right", y: TOP_SAFE };
  return {
    side: "right",
    y: clampY(window.innerHeight - RAIL_HEIGHT - bottomSafe() - 12),
  };
}

function readStoredState(): DockState {
  const fallback = defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DockState>;
    return {
      side: parsed.side === "left" ? "left" : "right",
      y: clampY(Number(parsed.y)),
    };
  } catch {
    return fallback;
  }
}

export function FloatingContactActions() {
  const [mounted, setMounted] = React.useState(false);
  const [dock, setDock] = React.useState<DockState>({ side: "right", y: TOP_SAFE });
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
    setDock(readStoredState());

    const reclamp = () => {
      setDock((current) => {
        const next = { ...current, y: clampY(current.y) };
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
  }, [save]);

  const beginDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    drag.current = {
      pointerId: event.pointerId,
      pointerY: event.clientY,
      startY: dock.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dy = event.clientY - state.pointerY;
    if (Math.abs(dy) > 3) state.moved = true;
    setDock((current) => ({ ...current, y: clampY(state.startY + dy) }));
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;

    if (!state.moved) {
      setDock((current) => {
        const next: DockState = {
          side: current.side === "right" ? "left" : "right",
          y: clampY(current.y),
        };
        save(next);
        return next;
      });
    } else {
      const side: Side = event.clientX < window.innerWidth / 2 ? "left" : "right";
      setDock((current) => {
        const next = { side, y: clampY(current.y) };
        save(next);
        return next;
      });
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    drag.current = null;
  };

  if (!mounted) return null;

  const sideStyle: React.CSSProperties =
    dock.side === "left" ? { left: EDGE, top: dock.y } : { right: EDGE, top: dock.y };

  return (
    <div
      style={sideStyle}
      className="fixed z-[96] flex w-[50px] flex-col items-center gap-2.5"
      data-floating-contact-dock={dock.side}
    >
      <a
        href={SITE_WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`WhatsApp ${SITE_CONTACT.phoneDisplay}`}
        title={`WhatsApp ${SITE_CONTACT.phoneDisplay}`}
        className="grid h-[50px] w-[50px] place-items-center rounded-full bg-green-500 text-white shadow-2xl ring-2 ring-white/90 transition active:scale-95"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      <a
        href={`tel:${SITE_CONTACT.phoneE164}`}
        aria-label={`Call ${SITE_CONTACT.phoneDisplay}`}
        title={`Call ${SITE_CONTACT.phoneDisplay}`}
        className="grid h-[50px] w-[50px] place-items-center rounded-full bg-white text-[#14256f] shadow-2xl ring-1 ring-slate-200 transition active:scale-95"
      >
        <Phone className="h-6 w-6" />
      </a>

      <button
        type="button"
        aria-label={`Move contact buttons to the ${dock.side === "right" ? "left" : "right"} side`}
        title="Drag vertically and release on the left or right. Tap once to swap sides."
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        className="grid h-7 w-9 touch-none place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-lg backdrop-blur active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
