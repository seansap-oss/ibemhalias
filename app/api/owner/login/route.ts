import { NextRequest, NextResponse } from "next/server";
import { checkOwnerPassword, issueOwnerToken, OWNER_COOKIE, ownerConfigured } from "@/lib/super-admin";
import { createAdminSessionToken, getAdminCookieName } from "@/lib/admin-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { checkRateLimit, clearRateLimit, getClientIp, recordRateLimitHit } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!ownerConfigured()) return NextResponse.json({ error: "Owner account is not configured." }, { status: 503 });
  const ip = getClientIp(request);
  const rlKey = `owner-login:${ip}`;
  const rl = checkRateLimit(rlKey, 5, 15 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || !checkOwnerPassword(body.password)) {
    recordRateLimitHit(rlKey, 15 * 60_000);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  clearRateLimit(rlKey);
  const adminToken = await createAdminSessionToken("owner:avit-solutions").catch(() => null);
  const { data: activity } = await createCmsServiceClient()
    .from("activity_sessions")
    .insert({ identity: "AViT owner", role: "owner" })
    .select("id")
    .single();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(OWNER_COOKIE, issueOwnerToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8 * 3600 });
  if (adminToken) {
    response.cookies.set(getAdminCookieName(), adminToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 3600 });
  }
  if (activity?.id) {
    response.cookies.set("avit_activity_session", activity.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 3600 });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
