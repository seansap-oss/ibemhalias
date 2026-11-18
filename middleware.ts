import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

const STAFF_LOGIN_PATH = "/staff/login";
const ADMIN_PUBLIC_PATHS = new Set([
  "/admin/login",
  "/admin/login/",
]);

async function idleAllowed(request: NextRequest, kind: "admin" | "teacher") {
  const id = request.cookies.get("avit_activity_session")?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const db = createSupabaseClient(url, key, { auth: { persistSession: false } });
  const [{ data: session }, { data: settings }] = await Promise.all([
    db.from("activity_sessions").select("role,last_seen_at,logged_out_at").eq("id", id).maybeSingle(),
    db.from("director_settings").select("admin_idle_minutes,teacher_idle_minutes").eq("id", true).single(),
  ]);
  if (!session || session.logged_out_at) return false;
  if (kind === "teacher" && session.role !== "instructor") return false;
  if (kind === "admin" && !["admin", "owner"].includes(session.role)) return false;
  const minutes = kind === "teacher" ? settings?.teacher_idle_minutes || 10 : settings?.admin_idle_minutes || 10;
  return Date.now() - new Date(session.last_seen_at).getTime() < minutes * 60_000;
}

function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isTeacherRoute(pathname: string) {
  return pathname === "/teacher" || pathname.startsWith("/teacher/");
}

function withPrivateNoStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  return response;
}

function redirectToStaffLogin(
  request: NextRequest,
  reason: string,
  requestedRole: "admin" | "teacher"
) {
  const url = request.nextUrl.clone();
  url.pathname = STAFF_LOGIN_PATH;
  url.search = "";
  url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
  url.searchParams.set("reason", reason);
  url.searchParams.set("role", requestedRole);
  return withPrivateNoStore(NextResponse.redirect(url));
}

function redirectAdminToTeacherManagement(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/teachers";
  url.search = "";
  return withPrivateNoStore(NextResponse.redirect(url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminRoute(pathname)) {
    if (ADMIN_PUBLIC_PATHS.has(pathname)) {
      return withPrivateNoStore(NextResponse.next());
    }

    const token = request.cookies.get(getAdminCookieName())?.value;
    const dedicatedAdmin = await verifyAdminSessionToken(token);

    if (dedicatedAdmin) {
      if (!(await idleAllowed(request, "admin"))) return redirectToStaffLogin(request, "idle-timeout", "admin");
      const response = NextResponse.next();
      response.headers.set("x-admin-guard", "admin-cookie-granted");
      return withPrivateNoStore(response);
    }

    const { response, userId, role, configured } = await updateSession(request);

    if (!configured || !userId) {
      return redirectToStaffLogin(request, "no-admin-session", "admin");
    }

    if (role !== "admin") {
      return redirectToStaffLogin(request, "forbidden", "admin");
    }

    if (!(await idleAllowed(request, "admin"))) return redirectToStaffLogin(request, "idle-timeout", "admin");

    response.headers.set("x-admin-guard", "supabase-granted");
    return withPrivateNoStore(response);
  }

  if (isTeacherRoute(pathname)) {
    if (pathname === "/teacher/login" || pathname === "/teacher/login/") {
      return withPrivateNoStore(NextResponse.next());
    }
    // Admins manage/inspect teachers from the CRM rather than impersonating
    // a teacher portal. This removes the confusing "Welcome, Administrator"
    // teacher-dashboard state seen in v5.5.7/v5.5.8.
    const token = request.cookies.get(getAdminCookieName())?.value;
    const dedicatedAdmin = await verifyAdminSessionToken(token);

    if (dedicatedAdmin) {
      return redirectAdminToTeacherManagement(request);
    }

    const { response, userId, role, configured } = await updateSession(request);

    if (!configured || !userId) {
      return redirectToStaffLogin(request, "no-teacher-session", "teacher");
    }

    if (role === "admin") {
      return redirectAdminToTeacherManagement(request);
    }

    if (role !== "instructor") {
      return redirectToStaffLogin(request, "teacher-forbidden", "teacher");
    }

    if (!(await idleAllowed(request, "teacher"))) return redirectToStaffLogin(request, "idle-timeout", "teacher");

    response.headers.set("x-teacher-guard", "instructor-granted");
    return withPrivateNoStore(response);
  }

  const { response } = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|icons/|splash/|.*\\.[\\w]+$).*)",
  ],
};
