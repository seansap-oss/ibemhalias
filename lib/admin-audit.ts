import { cookies } from "next/headers";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";
import { hasOwnerSession } from "@/lib/super-admin";
import { createSessionClient } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export async function resolveActorIdentity(): Promise<string> {
  try {
    if (await hasOwnerSession()) return "Super Admin";
    const token = (await cookies()).get(getAdminCookieName())?.value;
    const adminPayload = await verifyAdminSessionToken(token);
    if (adminPayload?.email) return String(adminPayload.email);
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (user?.email) return user.email;
  } catch {
    // Fallback
  }
  return "Admin";
}

export async function logAdminWork(action: string, target: string, details?: string) {
  try {
    const actor = await resolveActorIdentity();
    const db = createCmsServiceClient();
    await db.from("cms_content").insert({
      section_path: "admin-work-audit",
      title: action,
      month_label: actor,
      date_label: target,
      description: details || null,
      media_type: "note",
      is_published: false,
      access_level: "premium",
    });
  } catch {
    // Non-blocking audit log
  }
}
