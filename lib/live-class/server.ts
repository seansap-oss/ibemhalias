import { NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { requireCmsAdmin, createSessionClient } from "@/lib/supabase/server-session";

export function liveService() {
  return createCmsServiceClient();
}

export async function requireLiveAdmin() {
  try {
    return await requireCmsAdmin();
  } catch (error: any) {
    const code = error?.message === "FORBIDDEN" ? 403 : 401;
    throw Object.assign(new Error(error?.message || "UNAUTHENTICATED"), { status: code });
  }
}

export function adminError(error: any) {
  const status = Number(error?.status || 500);
  return NextResponse.json(
    { ok: false, error: error?.message || "Unexpected server error." },
    { status: Number.isFinite(status) ? status : 500 }
  );
}

export function normalizeIndianWhatsAppPhone(value?: string | null) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  return digits;
}

export function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function currentStudent() {
  const client = await createSessionClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  return user;
}

export function safeOrigin(value?: string | null) {
  try {
    if (!value) return "";
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}
