import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { requireCmsAdmin } from "@/lib/supabase/server-session";

const BUCKET = "cms-content";
const MAX_FILE_BYTES = 200 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "mp3",
  "wav",
  "m4a",
  "mp4",
  "mov",
  "webm",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
]);

function safeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    await requireCmsAdmin();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 200 MB upload limit." },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: `.${extension || "unknown"} files are not allowed.` },
        { status: 400 }
      );
    }

    const sectionPath = String(formData.get("section_path") || "general")
      .replace(/^\/+/, "")
      .replace(/[^\w\-\/]+/g, "-");

    const path = `${sectionPath}/${Date.now()}-${randomUUID()}-${safeName(file.name)}`;

    const supabase = createCmsServiceClient();

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

    if (error) throw error;

    return NextResponse.json({
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
    });
  } catch (error: any) {
    const message = error?.message || "Upload failed";
    const status =
      message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
