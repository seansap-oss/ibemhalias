import { NextRequest, NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { createSessionClient, requireCmsAdmin } from "@/lib/supabase/server-session";

const BUCKET = "cms-content";

type ViewerAccess = {
  isAdmin: boolean;
  authenticated: boolean;
  tier: string;
  flags: Record<string, boolean>;
  courseIds: Set<string>;
};

function errorPayload(error: any) {
  return { error: error?.message || "Unknown CMS error", code: error?.code || null, details: error?.details || null, hint: error?.hint || null };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function viewerAccess(): Promise<ViewerAccess> {
  try {
    await requireCmsAdmin();
    return { isAdmin: true, authenticated: true, tier: "all-access", flags: {}, courseIds: new Set() };
  } catch {}

  try {
    const session = await createSessionClient();
    const { data: authData } = await session.auth.getUser();
    const user = authData.user;
    if (!user) return { isAdmin: false, authenticated: false, tier: "free", flags: {}, courseIds: new Set() };

    const service = createCmsServiceClient();
    const [{ data: profile }, { data: prefs }, { data: enrollments }] = await Promise.all([
      service.from("profiles").select("tier").eq("id", user.id).maybeSingle(),
      service.from("student_access_preferences").select("material_flags").eq("student_id", user.id).maybeSingle(),
      service.from("enrollments").select("course_id").eq("user_id", user.id),
    ]);
    return {
      isAdmin: false,
      authenticated: true,
      tier: String(profile?.tier || "free"),
      flags: prefs?.material_flags && typeof prefs.material_flags === "object" ? prefs.material_flags : {},
      courseIds: new Set((enrollments || []).map((row: any) => row.course_id)),
    };
  } catch {
    return { isAdmin: false, authenticated: false, tier: "free", flags: {}, courseIds: new Set() };
  }
}

function allowed(item: any, viewer: ViewerAccess) {
  if (item.access_level !== "premium") return true;
  if (viewer.isAdmin || viewer.tier === "all-access") return true;
  if (item.course_id && !viewer.courseIds.has(item.course_id)) return false;
  const key = String(item.access_key || "general_premium");
  if (key === "general_premium") return ["premium", "foundation", "prelims", "mains", "optional"].includes(viewer.tier);
  return viewer.flags[key] === true;
}

async function attachSignedUrls(items: any[], viewer: ViewerAccess) {
  const service = createCmsServiceClient();
  return Promise.all(items.map(async (item) => {
    const canRead = allowed(item, viewer);
    if (!canRead) return { ...item, storage_path: null, external_url: null, thumbnail_path: null, media_url: null, thumbnail_url: null, locked: true, lock_reason: "premium_access_required" };
    let media_url = item.external_url || null;
    let thumbnail_url = null;
    if (item.storage_path) {
      const { data } = await service.storage.from(BUCKET).createSignedUrl(item.storage_path, 60 * 60);
      media_url = data?.signedUrl || null;
    }
    if (item.thumbnail_path) {
      const { data } = await service.storage.from(BUCKET).createSignedUrl(item.thumbnail_path, 60 * 60);
      thumbnail_url = data?.signedUrl || null;
    }
    return { ...item, media_url, thumbnail_url, locked: false, lock_reason: null };
  }));
}

export async function GET(request: NextRequest) {
  try {
    const sectionPath = request.nextUrl.searchParams.get("section");
    if (!sectionPath) return NextResponse.json({ error: "section is required" }, { status: 400 });
    const service = createCmsServiceClient();
    const { data, error } = await service.from("cms_content").select("*").eq("section_path", sectionPath).eq("is_published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) throw error;
    const viewer = await viewerAccess();
    return NextResponse.json({ items: await attachSignedUrls(data || [], viewer) });
  } catch (error: any) {
    return NextResponse.json(errorPayload(error), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCmsAdmin();
    const body = await request.json();
    if (!body.section_path || !body.title || !body.media_type) return NextResponse.json({ error: "section_path, title and media_type are required" }, { status: 400 });

    const accessLevel = body.access_level === "premium" ? "premium" : "free";
    const insertRow: Record<string, unknown> = {
      section_path: body.section_path,
      title: body.title,
      description: body.description || null,
      media_type: body.media_type,
      mime_type: body.mime_type || null,
      file_name: body.file_name || null,
      file_size: body.file_size || null,
      storage_path: body.storage_path || null,
      external_url: body.external_url || null,
      thumbnail_path: body.thumbnail_path || null,
      date_label: body.date_label || null,
      month_label: body.month_label || null,
      sort_order: Number(body.sort_order || 0),
      is_published: body.is_published !== false,
      access_level: accessLevel,
      access_key: accessLevel === "premium" ? String(body.access_key || "general_premium") : null,
      course_id: body.course_id || null,
    };
    if (isUuid((user as any)?.id)) insertRow.created_by = (user as any).id;
    const service = createCmsServiceClient();
    const { data, error } = await service.from("cms_content").insert(insertRow).select("*").single();
    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error: any) {
    const message = error?.message || "Unable to create content";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(errorPayload(error), { status });
  }
}
