const encoder = new TextEncoder();

const COOKIE_NAME = "ibemhal_admin_session";
const SESSION_HOURS = 8;
const DEFAULT_ADMIN_USERNAME = "admin";

export type AdminCredentials = {
  email: string;
  username: string;
  password: string;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizeIdentifier(value: string) {
  return String(value || "").trim().toLowerCase();
}

export function secureCompare(left: string, right: string) {
  const a = String(left ?? "");
  const b = String(right ?? "");

  if (a.length !== b.length) return false;

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return diff === 0;
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
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  if (configured) return configured;

  // Keep production usable when ADMIN_PASSWORD is already configured but a
  // separate session secret was not added yet. A dedicated
  // ADMIN_SESSION_SECRET is still recommended and takes precedence.
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    return `ibemhal-admin-session-v2:${password}`;
  }

  // Supabase service-role key is already a server-only secret in this app.
  // It provides a safe last-resort signing secret when an administrator uses
  // Supabase credentials and a dedicated ADMIN_SESSION_SECRET has not yet been
  // configured on Vercel. A dedicated ADMIN_SESSION_SECRET remains preferred.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    return `ibemhal-admin-session-v3:${serviceRoleKey}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "ibemhal-local-dev-session-secret-change-before-production";
  }

  throw new Error("ADMIN_LOGIN_NOT_CONFIGURED");
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export async function createAdminSessionToken(identity: string) {
  const normalizedIdentity = normalizeIdentifier(identity);
  if (!normalizedIdentity) {
    throw new Error("ADMIN_LOGIN_NOT_CONFIGURED");
  }

  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${normalizedIdentity}.${exp}`;
  const signature = await sign(payload, getSessionSecret());

  return `${payload}.${signature}`;
}

export async function verifyAdminSessionToken(token?: string | null) {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 3) return null;

  const signature = parts.pop()!;
  const expRaw = parts.pop()!;
  const identity = parts.join(".");
  const exp = Number(expRaw);

  if (!identity || !Number.isFinite(exp) || exp < Date.now()) {
    return null;
  }

  const payload = `${identity}.${exp}`;
  const expected = await sign(payload, getSessionSecret());

  if (!secureCompare(expected, signature)) {
    return null;
  }

  return {
    email: identity,
    identity,
    exp,
  };
}

export function getConfiguredAdminCredentials(): AdminCredentials {
  const email =
    process.env.ADMIN_EMAIL?.trim() ||
    (process.env.NODE_ENV !== "production"
      ? "admin@ibemhal.ias"
      : "");

  const username =
    process.env.ADMIN_USERNAME?.trim() ||
    DEFAULT_ADMIN_USERNAME;

  const password =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV !== "production"
      ? "admin@123"
      : "");

  return {
    email,
    username,
    password,
  };
}

// Backwards-compatible strict accessor for any existing server code that
// requires the dedicated environment-variable password.
export function getAdminCredentials(): AdminCredentials {
  const admin = getConfiguredAdminCredentials();
  if (!admin.password) {
    throw new Error("ADMIN_LOGIN_NOT_CONFIGURED");
  }
  return admin;
}

export function adminIdentifierMatches(
  identifier: string,
  admin: AdminCredentials
) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return false;

  const allowed = [admin.username, admin.email]
    .map(normalizeIdentifier)
    .filter(Boolean);

  return allowed.includes(normalized);
}

export function getAdminSessionIdentity(
  admin: AdminCredentials
) {
  return normalizeIdentifier(admin.email || admin.username);
}
