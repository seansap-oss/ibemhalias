import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";
import { hasOwnerSession } from "@/lib/super-admin";
import { createSessionClient } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXAM_PORTAL_BASE =
  process.env.NEXT_PUBLIC_EXAM_PORTAL_URL?.trim().replace(/\/$/, "") ||
  "https://ibemhaliasexamportal.vercel.app";

function getSharedSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "ibemhal-exam-sso-dev-secret"
  );
}

function signSsoToken(user: {
  id: string;
  email: string;
  name: string;
  role: "student" | "instructor" | "admin" | "director";
}) {
  const payload = {
    ...user,
    exp: Date.now() + 5 * 60_000, // 5-minute SSO handoff token
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSharedSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export async function GET(request: NextRequest) {
  const requestedNext = request.nextUrl.searchParams.get("next") || "";

  let ssoUser: {
    id: string;
    email: string;
    name: string;
    role: "student" | "instructor" | "admin" | "director";
  } | null = null;

  if (await hasOwnerSession()) {
    ssoUser = {
      id: "super-admin",
      email: "owner@ibemhalias.com",
      name: "Super Admin",
      role: "admin",
    };
  } else {
    const adminCookie = (await cookies()).get(getAdminCookieName())?.value;
    const adminPayload = await verifyAdminSessionToken(adminCookie);
    if (adminPayload?.email) {
      ssoUser = {
        id: "admin-cookie",
        email: String(adminPayload.email),
        name: "Admin",
        role: "admin",
      };
    } else {
      const session = await createSessionClient();
      const {
        data: { user },
      } = await session.auth.getUser();
      if (user) {
        const db = createCmsServiceClient();
        const { data: profile } = await db
          .from("profiles")
          .select("full_name,email,role")
          .eq("id", user.id)
          .maybeSingle();

        const rawRole = String(profile?.role || user.app_metadata?.role || "student").toLowerCase();
        const role: "student" | "instructor" | "admin" | "director" =
          rawRole === "admin" || rawRole === "director" || rawRole === "instructor"
            ? rawRole
            : "student";

        ssoUser = {
          id: user.id,
          email: profile?.email || user.email || "",
          name: profile?.full_name || user.user_metadata?.full_name || "User",
          role,
        };
      }
    }
  }

  if (!ssoUser) {
    return NextResponse.redirect(`${EXAM_PORTAL_BASE}/login`);
  }

  const nextPath =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : ["admin", "director", "instructor"].includes(ssoUser.role)
      ? "/admin"
      : "/";

  const token = signSsoToken(ssoUser);
  const target = `${EXAM_PORTAL_BASE}/api/auth/sso?token=${encodeURIComponent(token)}&next=${encodeURIComponent(
    nextPath
  )}`;
  return NextResponse.redirect(target);
}
