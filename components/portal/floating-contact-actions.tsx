"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, PanInfo } from "framer-motion";
import {
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  SITE_CONTACT,
  SITE_WHATSAPP_HREF,
} from "@/lib/site-contact";

const STORAGE_KEY = "ibemhal-contact-side";

type Props = {
  phoneNumber?: string;
  whatsappNumber?: string;
};

export function FloatingContactActions({
  phoneNumber = SITE_CONTACT.phoneE164,
  whatsappNumber = SITE_CONTACT.whatsappNumber,
}: Props) {
  const pathname = usePathname();

  const [side, setSide] =
    React.useState<"left" | "right">("left");

  React.useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(STORAGE_KEY);

      if (saved === "right" || saved === "left") {
        setSide(saved);
      }
    } catch {}
  }, []);

  const isReadingOrContentPage =
    pathname !== "/";

  const opacityClass =
    isReadingOrContentPage
      ? "opacity-70"
      : "opacity-100";

  const saveSide = (
    next: "left" | "right"
  ) => {
    setSide(next);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        next
      );
    } catch {}
  };

  const onDragEnd = (
    _: MouseEvent |
      TouchEvent |
      PointerEvent,
    info: PanInfo
  ) => {
    if (Math.abs(info.offset.x) < 25) {
      return;
    }

    saveSide(
      info.offset.x > 0
        ? "right"
        : "left"
    );
  };

  const cleanWhatsApp =
    whatsappNumber.replace(/\D/g, "");

  const whatsappHref =
    cleanWhatsApp ===
    SITE_CONTACT.whatsappNumber
      ? SITE_WHATSAPP_HREF
      : `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
          SITE_CONTACT.whatsappMessage
        )}`;

  const cleanPhone =
    phoneNumber.replace(/[^\d+]/g, "");

  const callHref =
    `tel:${cleanPhone}`;

  return (
    <motion.div
      drag="x"
      dragConstraints={{
        left: 0,
        right: 0,
      }}
      dragElastic={0.18}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      className={[
        "fixed bottom-[86px] z-[56] flex items-center gap-2 transition-all duration-300 md:bottom-5",
        side === "left"
          ? "left-4"
          : "right-4",
        opacityClass,
      ].join(" ")}
    >
      <a
        href={callHref}
        aria-label={`Call Ibemhal IAS on ${SITE_CONTACT.phoneDisplay}`}
        title={`Call ${SITE_CONTACT.phoneDisplay}`}
        onPointerDown={(event) =>
          event.stopPropagation()
        }
        className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#14256f] shadow-xl ring-1 ring-slate-200"
      >
        <Phone className="h-5 w-5" />
      </a>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`WhatsApp Ibemhal IAS on ${SITE_CONTACT.phoneDisplay}`}
        title={`WhatsApp ${SITE_CONTACT.phoneDisplay}`}
        onPointerDown={(event) =>
          event.stopPropagation()
        }
        className="grid h-12 w-12 place-items-center rounded-full bg-green-500 text-white shadow-xl"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </motion.div>
  );
}
