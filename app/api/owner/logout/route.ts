import { NextResponse } from "next/server";
import { OWNER_COOKIE } from "@/lib/super-admin";
import { getAdminCookieName } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(OWNER_COOKIE);
  response.cookies.delete(getAdminCookieName());
  return response;
}
