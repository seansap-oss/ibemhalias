import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { getSessionProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getSharedSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "ibemhal-exam-sso-dev-secret"
  );
}

function signSsoToken(payload: {
  id: string;
  email: string;
  name: string;
  role: string;
}) {
  const body = { ...payload, exp: Date.now() + 5 * 60 * 1000 }; // 5-minute handoff token
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSharedSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export async function GET(req: NextRequest) {
  const examPortalBase = (
    process.env.NEXT_PUBLIC_EXAM_PORTAL_URL ||
    "https://exams.avitsolutionslms.online"
  ).replace(/\/+$/, "");

  const nextPath = req.nextUrl.searchParams.get("next") || "/";
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(getAdminCookieName())?.value;
  const adminSession = await verifyAdminSessionToken(adminToken);

  if (adminSession) {
    const token = signSsoToken({
      id: "00000000-0000-0000-0000-000000000001",
      email: adminSession.email || "admin@ibemhal.ias",
      name: adminSession.identity || "Administrator",
      role: "admin",
    });
    const dest = `${examPortalBase}/api/auth/sso?token=${encodeURIComponent(
      token
    )}&next=${encodeURIComponent(nextPath === "/" ? "/admin" : nextPath)}`;
    return NextResponse.redirect(dest);
  }

  const profileData = await getSessionProfile().catch(() => null);
  if (profileData?.profile) {
    const { user, profile } = profileData;
    const role = String(profile.role || "student").toLowerCase();
    const token = signSsoToken({
      id: user.id,
      email: user.email || profile.email || "",
      name: profile.full_name || user.email?.split("@")[0] || "Student",
      role,
    });
    const dest = `${examPortalBase}/api/auth/sso?token=${encodeURIComponent(
      token
    )}&next=${encodeURIComponent(nextPath)}`;
    return NextResponse.redirect(dest);
  }

  return NextResponse.redirect(new URL("/login?next=/api/auth/exam-sso", req.url));
}
