import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";

type SiteTheme = "classic" | "premium";
const SETTINGS_PATH = "site-settings/website-theme";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value;
  return verifyAdminSessionToken(token);
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    if (error) throw error;
    return NextResponse.json({
      theme: data?.title === "premium" ? "premium" : "classic",
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read website theme." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { theme?: unknown } | null;
  const theme = body?.theme;
  if (theme !== "classic" && theme !== "premium") {
    return NextResponse.json({ error: "Theme must be classic or premium." }, { status: 400 });
  }

  try {
    const supabase = createCmsServiceClient();
    const { data: existing, error: readError } = await supabase
      .from("cms_content")
      .select("id")
      .eq("section_path", SETTINGS_PATH)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) throw readError;

    const values = {
      section_path: SETTINGS_PATH,
      title: theme,
      description: theme === "premium" ? "Premium emerald and gold public website theme" : "Classic Ibemhal IAS public website theme",
      media_type: "file",
      mime_type: "application/x-ibemhal-site-theme",
      file_name: "website-theme",
      sort_order: 0,
      is_published: true,
      updated_at: new Date().toISOString(),
    };

    const query = existing?.id
      ? supabase.from("cms_content").update(values).eq("id", existing.id)
      : supabase.from("cms_content").insert(values);

    const { data, error: writeError } = await query.select("title, updated_at").single();
    if (writeError) throw writeError;

    return NextResponse.json({ ok: true, theme: data.title === "premium" ? "premium" : "classic", updatedAt: data.updated_at });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save website theme." }, { status: 500 });
  }
}
