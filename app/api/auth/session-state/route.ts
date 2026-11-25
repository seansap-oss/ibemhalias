import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { getSessionProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function noStore(res: NextResponse) {
  res.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );
  res.headers.set("Pragma", "no-cache");
  return res;
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    // 1. Check dedicated admin cookie first
    const token = cookieStore.get(getAdminCookieName())?.value;
    const adminSession = await verifyAdminSessionToken(token);

    if (adminSession) {
      return noStore(
        NextResponse.json({
          authenticated: true,
          role: "admin",
          label: "Admin Workspace",
          href: "/admin/dashboard",
          name: adminSession.identity || "Admin",
          email: adminSession.email || null,
        })
      );
    }

    // 2. Check Supabase session (student, teacher/instructor, admin, director)
    const profileData = await getSessionProfile().catch(() => null);

    if (profileData?.profile) {
      const { user, profile } = profileData;
      const role = String(profile.role || "student").toLowerCase();

      let href = "/dashboard";
      let label = "Student Portal";

      if (role === "admin") {
        href = "/admin/dashboard";
        label = "Admin Workspace";
      } else if (role === "instructor" || role === "teacher") {
        href = "/teacher/dashboard";
        label = "Teacher Studio";
      } else if (role === "director") {
        href = "/director/dashboard";
        label = "Director Panel";
      }

      return noStore(
        NextResponse.json({
          authenticated: true,
          role,
          label,
          href,
          name: profile.full_name || user.email?.split("@")[0] || "User",
          email: user.email || profile.email || null,
          avatarUrl: profile.avatar_url || null,
        })
      );
    }

    return noStore(
      NextResponse.json({
        authenticated: false,
      })
    );
  } catch {
    return noStore(
      NextResponse.json({
        authenticated: false,
      })
    );
  }
}
