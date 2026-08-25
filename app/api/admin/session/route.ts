import { NextRequest, NextResponse } from "next/server";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value;
  const session = await verifyAdminSessionToken(token);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    email: session.email,
  });
}
