import { NextRequest, NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { requireCmsAdmin } from "@/lib/supabase/server-session";

const BUCKET = "cms-content";

function errorPayload(error: any) {
  return {
    error: error?.message || "Unknown CMS error",
    code: error?.code || null,
    details: error?.details || null,
    hint: error?.hint || null,
  };
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

async function attachSignedUrls(items: any[]) {
  const supabase = createCmsServiceClient();

  return Promise.all(
    items.map(async (item) => {
      let media_url = item.external_url || null;
      let thumbnail_url = null;

      if (item.storage_path) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(item.storage_path, 60 * 60);

        if (error) {
          console.error("CMS signed media URL error:", error);
        } else {
          media_url = data?.signedUrl || null;
        }
      }

      if (item.thumbnail_path) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(item.thumbnail_path, 60 * 60);

        if (error) {
          console.error("CMS signed thumbnail URL error:", error);
        } else {
          thumbnail_url = data?.signedUrl || null;
        }
      }

      return { ...item, media_url, thumbnail_url };
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    const sectionPath = request.nextUrl.searchParams.get("section");

    if (!sectionPath) {
      return NextResponse.json(
        { error: "section is required" },
        { status: 400 }
      );
    }

    const supabase = createCmsServiceClient();

    const { data, error } = await supabase
      .from("cms_content")
      .select("*")
      .eq("section_path", sectionPath)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("CMS GET query error:", error);
      return NextResponse.json(errorPayload(error), { status: 500 });
    }

    return NextResponse.json({
      items: await attachSignedUrls(data || []),
    });
  } catch (error: any) {
    console.error("CMS GET fatal error:", error);

    return NextResponse.json(
      errorPayload(error),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCmsAdmin();
    const body = await request.json();

    if (!body.section_path || !body.title || !body.media_type) {
      return NextResponse.json(
        { error: "section_path, title and media_type are required" },
        { status: 400 }
      );
    }

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
    };

    // Supabase-authenticated admins have UUID user IDs.
    // The local dedicated admin cookie intentionally does not.
    // Do not write a non-UUID into cms_content.created_by.
    if (isUuid((user as any)?.id)) {
      insertRow.created_by = (user as any).id;
    }

    const supabase = createCmsServiceClient();

    const { data, error } = await supabase
      .from("cms_content")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      console.error("CMS POST insert error:", error);
      return NextResponse.json(errorPayload(error), { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error: any) {
    console.error("CMS POST fatal error:", error);

    const message = error?.message || "Unable to create content";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;

    return NextResponse.json(errorPayload(error), { status });
  }
}
