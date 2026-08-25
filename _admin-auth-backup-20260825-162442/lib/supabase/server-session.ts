import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
            cookiesToSet.forEach(({ name, value, options }) =>
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
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const role =
    String(user.app_metadata?.role || user.user_metadata?.role || "").toLowerCase();

  const adminEmails = String(process.env.CMS_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const emailAllowed =
    !!user.email && adminEmails.includes(user.email.toLowerCase());

  if (!["admin", "super_admin", "content_admin"].includes(role) && !emailAllowed) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
