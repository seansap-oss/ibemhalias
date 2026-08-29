import { NextRequest, NextResponse } from "next/server";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { requireCmsAdmin } from "@/lib/supabase/server-session";

export const dynamic = "force-dynamic";

function noStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(getAdminCookieName())?.value;
    const session = await verifyAdminSessionToken(token);

    if (session) {
      return noStore(
        NextResponse.json({
          authenticated: true,
          role: "admin",
          email: session.email,
          identity: session.identity,
          authSource: "admin-cookie",
        })
      );
    }

    // The Admin area deliberately supports two valid authentication paths:
    // the dedicated Ibemhal admin cookie and an authenticated Supabase admin.
    // The middleware and Live Class APIs already support both, so this status
    // endpoint must not incorrectly report 401 for a valid Supabase admin.
    const admin = await requireCmsAdmin();
    const email = String((admin as any)?.email || "").trim();

    return noStore(
      NextResponse.json({
        authenticated: true,
        role: "admin",
        email: email || null,
        identity: email || String((admin as any)?.id || "admin"),
        authSource: "supabase-admin",
      })
    );
  } catch {
    return noStore(
      NextResponse.json(
        { authenticated: false, role: null },
        { status: 401 }
      )
    );
  }
}