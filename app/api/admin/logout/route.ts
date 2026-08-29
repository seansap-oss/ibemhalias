import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
    authenticated: false,
  });

  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );
  response.headers.set("Pragma", "no-cache");

  return response;
}
