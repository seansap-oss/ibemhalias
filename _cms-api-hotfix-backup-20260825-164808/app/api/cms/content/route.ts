import { NextRequest, NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { requireCmsAdmin } from "@/lib/supabase/server-session";

const BUCKET = "cms-content";

async function attachSignedUrls(items: any[]) {
  const supabase = createCmsServiceClient();

  return Promise.all(
    items.map(async (item) => {
      let media_url = item.external_url || null;
      let thumbnail_url = null;

      if (item.storage_path) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(item.storage_path, 60 * 60);

        media_url = data?.signedUrl || null;
      }

      if (item.thumbnail_path) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(item.thumbnail_path, 60 * 60);

        thumbnail_url = data?.signedUrl || null;
      }

      return { ...item, media_url, thumbnail_url };
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    const sectionPath = request.nextUrl.searchParams.get("section");
    if (!sectionPath) {
      return NextResponse.json({ error: "section is required" }, { status: 400 });
    }

    const supabase = createCmsServiceClient();

    const { data, error } = await supabase
      .from("cms_content")
      .select("*")
      .eq("section_path", sectionPath)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      items: await attachSignedUrls(data || []),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load content" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCmsAdmin();
    const body = await request.json();

    const supabase = createCmsServiceClient();

    const { data, error } = await supabase
      .from("cms_content")
      .insert({
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
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error: any) {
    const message = error?.message || "Unable to create content";
    const status =
      message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
