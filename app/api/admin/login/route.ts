import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  adminIdentifierMatches,
  createAdminSessionToken,
  getAdminCookieName,
  getConfiguredAdminCredentials,
  getAdminSessionIdentity,
  secureCompare,
} from "@/lib/admin-session";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function normalizeIdentifier(value: string) {
  return String(value || "").trim().toLowerCase();
}

function clearStudentAuthCookies(
  request: NextRequest,
  response: NextResponse
) {
  for (const cookie of request.cookies.getAll()) {
    const name = cookie.name.toLowerCase();
    const isSupabaseAuthCookie =
      name.startsWith("sb-") &&
      (name.includes("auth-token") ||
        name.endsWith("-access-token") ||
        name.endsWith("-refresh-token"));

    if (!isSupabaseAuthCookie) continue;

    response.cookies.set({
      name: cookie.name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }
}

async function verifySupabaseAdministrator(
  identifier: string,
  password: string,
  configuredAdmin: ReturnType<typeof getConfiguredAdminCredentials>
) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !password) {
    return null;
  }

  const normalized = normalizeIdentifier(identifier);
  const configuredUsername = normalizeIdentifier(configuredAdmin.username);
  const configuredEmail = normalizeIdentifier(configuredAdmin.email);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const serviceClient = serviceRoleKey
    ? createSupabaseClient(SUPABASE_URL, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

  let candidateEmail = normalized.includes("@")
    ? normalized
    : normalized === configuredUsername
      ? configuredEmail
      : "";

  // If Vercel has not been given ADMIN_EMAIL yet, the friendly `admin` alias
  // can still resolve safely when there is exactly one Admin profile.
  if (!candidateEmail && normalized === configuredUsername && serviceClient) {
    const { data: admins } = await serviceClient
      .from("profiles")
      .select("email")
      .eq("role", "admin")
      .limit(2);

    if (admins?.length === 1) {
      candidateEmail = normalizeIdentifier(admins[0]?.email);
    }
  }

  if (!candidateEmail) return null;

  const supabase = createSupabaseClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: candidateEmail,
    password,
  });

  if (error || !data.user) {
    return null;
  }

  const roleClient = serviceClient || supabase;
  const { data: profile, error: profileError } = await roleClient
    .from("profiles")
    .select("role, email")
    .eq("id", data.user.id)
    .maybeSingle();

  await supabase.auth.signOut().catch(() => undefined);

  if (profileError || normalizeIdentifier(profile?.role) !== "admin") {
    return null;
  }

  return normalizeIdentifier(
    profile?.email || data.user.email || candidateEmail
  );
}

function noStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const identifier = String(
      body?.identifier ??
        body?.email ??
        body?.username ??
        ""
    ).trim();

    const password = String(body?.password ?? "");
    const admin = getConfiguredAdminCredentials();

    let identity = "";
    let authSource: "configured" | "supabase" = "configured";

    const configuredCredentialsMatch =
      Boolean(admin.password) &&
      adminIdentifierMatches(identifier, admin) &&
      secureCompare(password, admin.password);

    if (configuredCredentialsMatch) {
      identity = getAdminSessionIdentity(admin);
    } else {
      const supabaseIdentity =
        await verifySupabaseAdministrator(
          identifier,
          password,
          admin
        );

      if (!supabaseIdentity) {
        return noStore(
          NextResponse.json(
            { error: "Invalid admin ID or password." },
            { status: 401 }
          )
        );
      }

      identity = supabaseIdentity;
      authSource = "supabase";
    }

    const token = await createAdminSessionToken(identity);

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      role: "admin",
      identity,
      authSource,
    });

    // A successful administrator sign-in must replace any Student session in
    // this browser. Clear Supabase SSR auth cookies on the server response;
    // the client also clears its in-memory Supabase session after success.
    clearStudentAuthCookies(request, response);

    response.cookies.set({
      name: getAdminCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return noStore(response);
  } catch (error: any) {
    const message =
      error?.message === "ADMIN_LOGIN_NOT_CONFIGURED"
        ? "Admin login is not configured on this deployment."
        : "Unable to sign in.";

    const status =
      error?.message === "ADMIN_LOGIN_NOT_CONFIGURED"
        ? 503
        : 500;

    return noStore(
      NextResponse.json(
        { error: message },
        { status }
      )
    );
  }
}
