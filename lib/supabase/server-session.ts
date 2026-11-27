import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { hasOwnerSession } from "@/lib/super-admin";

export async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) =>
                cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot always write cookies.
          }
        },
      },
    }
  );
}

export async function requireCmsAdmin() {
  if (await hasOwnerSession()) {
    return {
      id: "owner:avit-solutions",
      email: "owner@avit-solutions",
    };
  }

  const cookieStore = await cookies();

  const adminToken =
    cookieStore.get(getAdminCookieName())?.value;

  const dedicatedAdmin =
    await verifyAdminSessionToken(adminToken);

  if (dedicatedAdmin) {
    return {
      id: `admin:${dedicatedAdmin.email}`,
      email: dedicatedAdmin.email,
    };
  }

  const supabase = await createSessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  if (user.app_metadata?.paused === true) {
    throw new Error("FORBIDDEN");
  }

  const { data: current, error: statusError } = await createCmsServiceClient().auth.admin.getUserById(user.id);
  if (statusError || !current.user || current.user.app_metadata?.paused === true) {
    throw new Error("FORBIDDEN");
  }

  // User metadata is editable by the account holder and must not grant CMS access.
  const role = String(user.app_metadata?.role || "").toLowerCase();

  const adminEmails = String(
    process.env.CMS_ADMIN_EMAILS || ""
  )
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const emailAllowed =
    !!user.email &&
    adminEmails.includes(user.email.toLowerCase());

  if (
    !["admin", "super_admin", "content_admin"].includes(role) &&
    !emailAllowed
  ) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
