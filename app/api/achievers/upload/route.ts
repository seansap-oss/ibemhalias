import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

const BUCKET = "cms-content";
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

async function adminAllowed() {
  const store = await cookies();
  return Boolean(store.get("ibemhal_admin_session")?.value);
}

export async function POST(req: NextRequest) {
  if (!(await adminAllowed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP, or GIF images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be under 15 MB." },
        { status: 400 }
      );
    }

    const safeBase = file.name
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-");
    const path = `achievers-gallery/${Date.now()}-${randomUUID()}-${safeBase}`;

    const supabase = getMockTestAdminClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({
      ok: true,
      url: pub.publicUrl,
      storage_path: path,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
