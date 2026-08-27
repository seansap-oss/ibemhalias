import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdminSessionToken(
    request.cookies.get(getAdminCookieName())?.value
  );
  if (!admin) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const requested = Number(request.nextUrl.searchParams.get("size") || 2_097_152);
  const size = Math.min(Math.max(requested, 256 * 1024), 2 * 1024 * 1024);
  const bytes = randomBytes(size);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate",
      "content-type": "application/octet-stream",
      "content-length": String(bytes.byteLength),
      "content-encoding": "identity",
      "x-ibemhal-network-check": "download",
    },
  });
}
