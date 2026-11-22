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
  if (user.app_metadata?.paused === true) return false;
  const service = createCmsServiceClient();
  const { data: current, error: statusError } = await service.auth.admin.getUserById(user.id);
  if (statusError || !current.user || current.user.app_metadata?.paused === true) return false;
  const { data } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin";
}
