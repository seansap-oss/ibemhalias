import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdminSessionToken(
    request.cookies.get(getAdminCookieName())?.value
  );
  if (!admin) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const startedAt = Date.now();
  const body = await request.arrayBuffer();

  if (body.byteLength > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Upload sample is too large." }, { status: 413 });
  }

  return NextResponse.json(
    {
      ok: true,
      receivedBytes: body.byteLength,
      serverProcessingMs: Date.now() - startedAt,
    },
    {
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate",
        "x-ibemhal-network-check": "upload",
      },
    }
  );
}
