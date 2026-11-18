import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/admin-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  const activityId = (await cookies()).get("avit_activity_session")?.value;
  if (activityId) await createCmsServiceClient().from("activity_sessions").update({ logged_out_at: new Date().toISOString() }).eq("id", activityId).is("logged_out_at", null);
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
  response.cookies.delete("avit_activity_session");

  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );
  response.headers.set("Pragma", "no-cache");

  return response;
}
