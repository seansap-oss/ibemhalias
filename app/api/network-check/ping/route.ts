import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await verifyAdminSessionToken(
    request.cookies.get(getAdminCookieName())?.value
  );
  if (!admin) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  return new NextResponse("pong", {
    status: 200,
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate",
      "content-type": "text/plain; charset=utf-8",
      "x-ibemhal-network-check": "ping",
    },
  });
}
