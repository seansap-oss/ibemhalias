import { cookies } from "next/headers";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";

export async function requireMockAdmin() {
  const store = await cookies();
  const token = store.get(getAdminCookieName())?.value;
  return await verifyAdminSessionToken(token);
}
