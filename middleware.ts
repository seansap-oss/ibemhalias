import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

const LOGIN_PATH = "/admin/login";

const ADMIN_PUBLIC_PATHS = new Set([
  LOGIN_PATH,
  "/admin/login/",
]);

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function redirectToLogin(
  request: NextRequest,
  reason: string
): NextResponse {
  const url = request.nextUrl.clone();

  url.pathname = LOGIN_PATH;
  url.search = "";
  url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
  url.searchParams.set("reason", reason);

  const redirect = NextResponse.redirect(url);
  redirect.headers.set("x-admin-guard", reason);

  return redirect;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { response, userId, role, configured } =
    await updateSession(request);

  if (!isAdminRoute(pathname)) {
    return response;
  }

  if (ADMIN_PUBLIC_PATHS.has(pathname)) {
    return response;
  }

  // First allow the dedicated Ibemhal admin cookie session.
  const token = request.cookies.get(getAdminCookieName())?.value;
  const adminSession = await verifyAdminSessionToken(token);

  if (adminSession) {
    response.headers.set("x-admin-guard", "admin-cookie-granted");
    return response;
  }

  // Existing Supabase admin session remains supported.
  if (!configured) {
    return redirectToLogin(request, "no-admin-session");
  }

  if (!userId) {
    return redirectToLogin(request, "no-session");
  }

  if (role !== "admin") {
    return redirectToLogin(request, "forbidden");
  }

  response.headers.set("x-admin-guard", "supabase-granted");
  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|icons/|splash/|.*\\.[\\w]+$).*)",
  ],
};
