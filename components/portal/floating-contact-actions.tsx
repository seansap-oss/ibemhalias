"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import {
  SITE_CONTACT,
  SITE_WHATSAPP_HREF,
} from "@/lib/site-contact";

type Point = { x: number; y: number };
type ButtonId = "call" | "whatsapp";

const BUTTON_SIZE = 48;
const EDGE_GAP = 10;
const TOP_SAFE = 82;
const STORAGE_PREFIX = "ibemhal-contact-position-v4";

function bottomSafe() {
  return typeof window !== "undefined" && window.innerWidth < 768 ? 96 : 20;
}

function clamp(point: Point) {
  if (typeof window === "undefined") return point;
  return {
    x: Math.min(
      Math.max(point.x, EDGE_GAP),
      Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP)
    ),
    y: Math.min(
      Math.max(point.y, TOP_SAFE),
      Math.max(
        TOP_SAFE,
        window.innerHeight - BUTTON_SIZE - bottomSafe()
      )
    ),
  };
}

function defaultPoint(id: ButtonId): Point {
  if (typeof window === "undefined") return { x: EDGE_GAP, y: TOP_SAFE };
  const x = window.innerWidth - BUTTON_SIZE - 14;
  const callY = window.innerHeight - BUTTON_SIZE - bottomSafe() - 8;
  return clamp({
    x,
    y: id === "call" ? callY : callY - BUTTON_SIZE - 10,
  });
}

function Movable({
  id,
  href,
  title,
  external,
  className,
  children,
}: {
  id: ButtonId;
  href: string;
  title: string;
  external?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState<Point>({ x: EDGE_GAP, y: TOP_SAFE });
  const drag = React.useRef<any>(null);

  const save = React.useCallback((point: Point) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}:${id}`, JSON.stringify(point));
    } catch {}
  }, [id]);

  React.useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}:${id}`);
      setPosition(raw ? clamp(JSON.parse(raw)) : defaultPoint(id));
    } catch {
      setPosition(defaultPoint(id));
    }

    const resize = () => {
      setPosition((current) => {
        const next = clamp(current);
        save(next);
        return next;
      });
    };
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, [id, save]);

  const onPointerDown = (event: React.PointerEvent<HTMLAnchorElement>) => {
    drag.current = {
      pointerId: event.pointerId,
      startX: position.x,
      startY: position.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.pointerX;
    const dy = event.clientY - state.pointerY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.moved = true;
    setPosition(clamp({ x: state.startX + dx, y: state.startY + dy }));
  };

  const finish = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const state = drag.current;
    if (!state) return;
    const next = clamp(position);
    setPosition(next);
    save(next);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    window.setTimeout(() => {
      drag.current = null;
    }, 0);
  };

  const style: React.CSSProperties = mounted
    ? { left: position.x, top: position.y }
    : id === "whatsapp"
      ? { right: 14, bottom: 154 }
      : { right: 14, bottom: 96 };

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      title={`${title} · drag to move · double-click to reset`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClick={(event) => {
        if (drag.current?.moved) event.preventDefault();
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        const next = defaultPoint(id);
        setPosition(next);
        save(next);
      }}
      style={style}
      className={`fixed z-[56] grid h-12 w-12 touch-none select-none place-items-center rounded-full shadow-xl cursor-grab active:cursor-grabbing ${className}`}
    >
      {children}
    </a>
  );
}

export function FloatingContactActions() {
  const pathname = usePathname();
  const dim = pathname !== "/" ? "opacity-70 hover:opacity-100" : "opacity-100";

  return (
    <>
      <Movable
        id="whatsapp"
        href={SITE_WHATSAPP_HREF}
        title={`WhatsApp ${SITE_CONTACT.phoneDisplay}`}
        external
        className={`bg-green-500 text-white ring-1 ring-green-600/20 ${dim}`}
      >
        <MessageCircle className="h-5 w-5" />
      </Movable>
      <Movable
        id="call"
        href={`tel:${SITE_CONTACT.phoneE164}`}
        title={`Call ${SITE_CONTACT.phoneDisplay}`}
        className={`bg-white text-[#14256f] ring-1 ring-slate-200 ${dim}`}
      >
        <Phone className="h-5 w-5" />
      </Movable>
    </>
  );
}
