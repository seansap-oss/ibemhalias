import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const OWNER_COOKIE = "avit_owner_session";
const HOURS = 8;

function secret() { return process.env.AVIT_OWNER_SESSION_SECRET || ""; }
export function ownerConfigured() { return Boolean(process.env.AVIT_OWNER_PASSWORD_HASH && secret()); }
export function checkOwnerPassword(password: string) {
  const stored = process.env.AVIT_OWNER_PASSWORD_HASH || "";
  const [salt, expected] = stored.split(":");
  if (!salt || !expected || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const actual = scryptSync(password, salt, 32);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("hex"); }
export function issueOwnerToken() {
  const payload = String(Date.now() + HOURS * 3600_000);
  return `${payload}.${sign(payload)}`;
}
export function validOwnerToken(token?: string) {
  if (!token || !ownerConfigured()) return false;
  const [payload, signature] = token.split(".");
  if (!/^\d{13}$/.test(payload || "") || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  if (Number(payload) < Date.now()) return false;
  return timingSafeEqual(Buffer.from(sign(payload), "hex"), Buffer.from(signature, "hex"));
}
export async function hasOwnerSession() {
  const jar = await cookies();
  return validOwnerToken(jar.get(OWNER_COOKIE)?.value);
}
