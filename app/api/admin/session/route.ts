import { NextRequest, NextResponse } from "next/server";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

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

    if (!session) {
      return noStore(
        NextResponse.json(
          { authenticated: false, role: null },
          { status: 401 }
        )
      );
    }

    return noStore(
      NextResponse.json({
        authenticated: true,
        role: "admin",
        email: session.email,
        identity: session.identity,
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
