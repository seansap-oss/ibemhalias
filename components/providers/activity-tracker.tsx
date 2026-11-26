"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const post = (url: string, body: object) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined);

export function ActivityTracker() {
  const path = usePathname();
  const [idleWarning, setIdleWarning] = React.useState(false);
  const [countdown, setCountdown] = React.useState(30);
  const lastRef = React.useRef<number>(Date.now());
  const roleRef = React.useRef<"admin" | "teacher" | null>(null);

  React.useEffect(() => {
    if (
      !/^\/(admin|teacher|director|owner|dashboard|student|courses|resources|current-affairs)/.test(
        path
      ) ||
      /\/login/.test(path)
    ) {
      setIdleWarning(false);
      return;
    }

    lastRef.current = Date.now();
    let limit = 0;
    const role = path.startsWith("/teacher")
      ? "teacher"
      : path.startsWith("/admin") || path.startsWith("/director")
      ? "admin"
      : null;
    roleRef.current = role;

    const touch = () => {
      lastRef.current = Date.now();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastRef.current = Date.now();
        void post("/api/activity/session", { action: "heartbeat" });
      }
    };

    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    document.addEventListener("visibilitychange", onVisibility);

    void post("/api/activity/session", { action: "start" });

    if (role) {
      void fetch("/api/activity/settings")
        .then((r) => r.json())
        .then((j) => {
          const mins = role === "teacher" ? j.teacher : j.admin;
          if (mins && Number(mins) > 0) {
            limit = Number(mins) * 60_000;
          }
        })
        .catch(() => undefined);
    }

    const timer = setInterval(() => {
      if (role && limit && Date.now() - lastRef.current >= limit) {
        setIdleWarning(true);
      }
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastRef.current < 60_000
      ) {
        void post("/api/activity/session", { action: "heartbeat" });
        if (/^\/(courses|resources|current-affairs)\//.test(path)) {
          void post("/api/activity/view", { target: path });
        }
      }
    }, 30_000);

    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [path]);

  const stayLoggedIn = () => {
    lastRef.current = Date.now();
    setIdleWarning(false);
    setCountdown(30);
    void post("/api/activity/session", { action: "heartbeat" });
  };

  const handleLogout = React.useCallback(async () => {
    setIdleWarning(false);
    await post("/api/activity/session", { action: "logout" });
    if (roleRef.current === "admin") {
      await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    }
    const db = createClient();
    if (db) await db.auth.signOut().catch(() => undefined);
    window.location.assign("/login");
  }, []);

  React.useEffect(() => {
    if (!idleWarning) {
      setCountdown(30);
      return;
    }
    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          void handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [idleWarning, handleLogout]);

  if (!idleWarning) return null;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">
              Inactivity Notice
            </h3>
            <p className="text-xs text-slate-500">
              You have been idle. Auto-signing out in <span className="font-black text-rose-600">{countdown}s</span>.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
          <button
            type="button"
            onClick={stayLoggedIn}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#14256f] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#1d348f]"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
