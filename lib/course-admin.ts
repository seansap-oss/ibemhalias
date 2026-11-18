import { cookies } from "next/headers";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";
import { hasOwnerSession } from "@/lib/super-admin";
import { createSessionClient } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export async function canManageCourses() {
  if (await hasOwnerSession()) return true;
  const token = (await cookies()).get(getAdminCookieName())?.value;
  if (await verifyAdminSessionToken(token)) return true;
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return false;
  const { data } = await createCmsServiceClient().from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin";
}
