import { NextRequest, NextResponse } from "next/server";
import { checkOwnerPassword, issueOwnerToken, OWNER_COOKIE, ownerConfigured } from "@/lib/super-admin";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!ownerConfigured()) return NextResponse.json({ error: "Owner account is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || !checkOwnerPassword(body.password))
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(OWNER_COOKIE, issueOwnerToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8 * 3600 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
