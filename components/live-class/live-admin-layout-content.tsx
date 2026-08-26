"use client";
import { LiveAdminShell } from "./live-admin-shell";
export function LiveAdminLayoutContent({ children }: { children: React.ReactNode }) {
  return <LiveAdminShell>{children}</LiveAdminShell>;
}
