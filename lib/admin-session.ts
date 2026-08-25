const encoder = new TextEncoder();

const COOKIE_NAME = "ibemhal_admin_session";
const SESSION_HOURS = 8;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

function getSessionSecret() {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured) return configured;

  if (process.env.NODE_ENV !== "production") {
    return "ibemhal-local-dev-session-secret-change-before-production";
  }

  throw new Error("ADMIN_SESSION_SECRET is required in production.");
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export async function createAdminSessionToken(email: string) {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${email}.${exp}`;
  const signature = await sign(payload, getSessionSecret());
  return `${payload}.${signature}`;
}

export async function verifyAdminSessionToken(token?: string | null) {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 3) return null;

  const signature = parts.pop()!;
  const expRaw = parts.pop()!;
  const email = parts.join(".");
  const exp = Number(expRaw);

  if (!email || !Number.isFinite(exp) || exp < Date.now()) return null;

  const payload = `${email}.${exp}`;
  const expected = await sign(payload, getSessionSecret());

  if (expected !== signature) return null;

  return { email, exp };
}

export function getAdminCredentials() {
  const email =
    process.env.ADMIN_EMAIL ||
    (process.env.NODE_ENV !== "production" ? "admin@ibemhal.ias" : "");

  const password =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV !== "production" ? "admin@123" : "");

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required in production."
    );
  }

  return { email, password };
}
