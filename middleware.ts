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

function withPrivateNoStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  return response;
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

  return withPrivateNoStore(redirect);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminRoute(pathname)) {
    // Keep the dedicated admin flow isolated from any Supabase student
    // session that may already exist in the same browser.
    if (ADMIN_PUBLIC_PATHS.has(pathname)) {
      const publicResponse = NextResponse.next();
      publicResponse.headers.set("x-admin-guard", "public-admin-login");
      return withPrivateNoStore(publicResponse);
    }

    const token = request.cookies.get(getAdminCookieName())?.value;
    const adminSession = await verifyAdminSessionToken(token);

    if (adminSession) {
      const response = NextResponse.next();
      response.headers.set("x-admin-guard", "admin-cookie-granted");
      return withPrivateNoStore(response);
    }

    // Existing Supabase administrator sessions remain supported as a
    // compatibility fallback, but are checked only when no dedicated
    // administrator cookie is present.
    const { response, userId, role, configured } =
      await updateSession(request);

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
    return withPrivateNoStore(response);
  }

  // Normal website/student routes keep the existing Supabase refresh flow.
  const { response } = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|icons/|splash/|.*\\.[\\w]+$).*)",
  ],
};
