"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import * as React from "react";
import { portalNavItems } from "./nav-items";

export function PortalSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(true);

  return (
    <aside
      className={[
        "portal-sidebar hidden lg:flex shrink-0 flex-col rounded-[28px] border border-blue-900/20 bg-gradient-to-b from-[#162364] via-[#132263] to-[#0d194b] text-white shadow-xl shadow-blue-950/15 transition-all duration-300",
        expanded ? "w-[270px]" : "w-[86px]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? "Collapse menu" : "Expand menu"}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white transition hover:bg-white/15"
        >
          {expanded ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {expanded && (
          <span className="pr-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
            Portal Menu
          </span>
        )}
      </div>

      <nav className="mt-5 flex-1 space-y-2 p-3">
        {portalNavItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={[
                "flex min-h-12 items-center rounded-2xl border transition",
                expanded ? "gap-3 px-4 py-2.5" : "justify-center px-2",
                active
                  ? "border-white/25 bg-white/18 text-white shadow-md backdrop-blur-sm"
                  : "border-transparent bg-transparent text-blue-100/90 hover:border-white/10 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {expanded && <span className="text-sm font-bold leading-tight">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          {expanded ? (
            <>
              <div className="text-sm font-black">Need Guidance?</div>
              <div className="mt-1 text-xs leading-relaxed text-blue-100">
                Use Mentorship &amp; Counselling to book a slot.
              </div>
              <Link
                href="/mentorship"
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-[#10246e]"
              >
                Book a Slot
              </Link>
            </>
          ) : (
            <Link
              href="/mentorship"
              title="Book a slot"
              className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#10246e]"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
