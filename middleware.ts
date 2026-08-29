import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

const STAFF_LOGIN_PATH = "/staff/login";
const ADMIN_PUBLIC_PATHS = new Set([
  "/admin/login",
  "/admin/login/",
]);

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

    response.headers.set("x-admin-guard", "supabase-granted");
    return withPrivateNoStore(response);
  }

  if (isTeacherRoute(pathname)) {
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
