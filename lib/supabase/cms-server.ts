import { createClient } from "@supabase/supabase-js";

function clean(value?: string) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

export function createCmsServiceClient() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceKey) {
    throw new Error(
      "CMS requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
