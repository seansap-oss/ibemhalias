import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface SessionCheck {
  response: NextResponse;
  userId: string | null;
  role: string | null;
  configured: boolean;
}

/**
 * Refreshes the Supabase auth cookie and resolves the caller's role.
 * Must run inside Next.js middleware so cookies propagate to the browser.
 */
export async function updateSession(request: NextRequest): Promise<SessionCheck> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return { response, userId: null, role: null, configured: false };
  }

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() revalidates the JWT against Supabase — do not trust getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response, userId: null, role: null, configured: true };
  }

  if (user.app_metadata?.paused === true) {
    return { response, userId: null, role: null, configured: true };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Supabase can continue accepting an existing JWT after a user is banned.
  // Resolve staff status from the current Auth record on each protected page load.
  if (["admin", "director"].includes(profile?.role || "")) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return { response, userId: null, role: null, configured: true };
    const service = createSupabaseClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
    const { data: current, error } = await service.auth.admin.getUserById(user.id);
    if (error || !current.user || current.user.app_metadata?.paused === true) {
      return { response, userId: null, role: null, configured: true };
    }
  }

  return {
    response,
    userId: user.id,
    role: profile?.role ?? null,
    configured: true,
  };
}
