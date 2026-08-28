import { NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SiteTheme = "classic" | "premium";
const SETTINGS_PATH = "site-settings/website-theme";

export async function GET() {
  let theme: SiteTheme = "classic";
  try {
    const supabase = createCmsServiceClient();
    const { data, error } = await supabase
      .from("cms_content")
      .select("title, updated_at")
      .eq("section_path", SETTINGS_PATH)
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data?.title === "premium") theme = "premium";
  } catch {
    // Do not break the website if settings/CMS are temporarily unavailable.
  }

  return NextResponse.json({ theme }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
