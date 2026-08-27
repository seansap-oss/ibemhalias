import { NextRequest, NextResponse } from "next/server";
import {
  requireLiveAdmin,
  liveService,
} from "@/lib/live-class/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "psm1", "vbs", "vbe",
  "js", "mjs", "cjs", "jar", "apk", "appx", "dll", "sys", "reg", "hta",
  "html", "htm", "svg", "docm", "xlsm", "pptm",
]);


function extensionOf(fileName: string) {
  const clean = fileName.trim().toLowerCase();
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1) : "";
}

function resourceTypeFor(fileName: string, mime: string) {
  const ext = extensionOf(fileName);
  const lowerMime = mime.toLowerCase();

  if (ext === "pdf" || lowerMime === "application/pdf") return "pdf";
  if (lowerMime.startsWith("image/") || ["jpg","jpeg","png","webp","gif","bmp"].includes(ext)) return "image";
  if (lowerMime.startsWith("audio/") || ["mp3","m4a","aac","wav","ogg","flac"].includes(ext)) return "audio";
  if (lowerMime.startsWith("video/") || ["mp4","mov","m4v","avi","mkv","webm"].includes(ext)) return "video";
  if (["txt","md","rtf","json"].includes(ext) || lowerMime.startsWith("text/")) return "notes";
  if (["doc","docx"].includes(ext)) return "notes";
  if (["xls","xlsx","csv"].includes(ext)) return "file";
  if (["ppt","pptx"].includes(ext)) return "slides";
  if (ext === "zip") return "file";
  return "file";
}

function validateFile(fileName: string, size: number) {
  const ext = extensionOf(fileName);

  if (!fileName || !size) {
    return "A non-empty file is required.";
  }
  if (size > MAX_BYTES) {
    return "Maximum file size is 50 MB per file.";
  }
  if (!ext || BLOCKED_EXTENSIONS.has(ext)) {
    return "That file type is not allowed in Live Now class materials.";
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireLiveAdmin();
    const body = await request.json();
    const action = String(body.action || "");
    const classId = String(body.classId || "");
    const client = liveService();

    if (!classId) {
      return NextResponse.json(
        { ok: false, error: "classId is required." },
        { status: 400 }
      );
    }

    if (action === "prepare") {
      const fileName = String(body.fileName || "");
      const mime = String(body.mime || "application/octet-stream");
      const size = Number(body.size || 0);
      const validationError = validateFile(fileName, size);

      if (validationError) {
        const status = size > MAX_BYTES ? 413 : 415;
        return NextResponse.json(
          { ok: false, error: validationError },
          { status }
        );
      }

      const safeName = fileName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-120);
      const path = `live-classes/${classId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { data: signed, error } =
        await client.storage
          .from("cms-content")
          .createSignedUploadUrl(path);
      if (error) throw error;

      return NextResponse.json({
        ok: true,
        upload: {
          bucket: "cms-content",
          path,
          token: signed.token,
        },
        detectedResourceType: resourceTypeFor(fileName, mime),
      });
    }

    if (action === "commit") {
      const path = String(body.path || "");
      const title = String(body.title || "").slice(0, 240);
      const mime = String(body.mime || "application/octet-stream");
      const size = Number(body.size || 0);
      const resourceType = String(
        body.resourceType || resourceTypeFor(title, mime)
      );
      const validationError = validateFile(title, size);

      if (validationError) {
        const status = size > MAX_BYTES ? 413 : 415;
        return NextResponse.json(
          { ok: false, error: validationError },
          { status }
        );
      }

      if (!path || !path.startsWith(`live-classes/${classId}/`)) {
        return NextResponse.json(
          { ok: false, error: "Invalid resource path." },
          { status: 400 }
        );
      }

      const { data: lastResource } = await client
        .from("live_class_resources")
        .select("sort_order")
        .eq("live_class_id", classId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextSortOrder = Math.max(0, Number(lastResource?.sort_order || 0)) + 1;

      const { data, error } = await client
        .from("live_class_resources")
        .insert({
          live_class_id: classId,
          title,
          resource_type: resourceType,
          storage_path: path,
          mime_type: mime,
          file_size: size,
          uploaded_by_email:
            (admin as any)?.email || "admin",
          sort_order: nextSortOrder,
        })
        .select("*")
        .single();
      if (error) throw error;

      const { data: signed } = await client.storage
        .from("cms-content")
        .createSignedUrl(path, 6 * 60 * 60);

      return NextResponse.json({
        ok: true,
        resource: {
          ...data,
          url: signed?.signedUrl || null,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown resource action." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Resource action failed.",
      },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireLiveAdmin();
    const id = request.nextUrl.searchParams.get("id") || "";
    const client = liveService();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Resource id is required." },
        { status: 400 }
      );
    }

    const { data, error: lookupError } = await client
      .from("live_class_resources")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (data?.storage_path) {
      const { error: storageError } = await client.storage
        .from("cms-content")
        .remove([data.storage_path]);
      if (storageError) throw storageError;
    }

    const { error } = await client
      .from("live_class_resources")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Delete failed.",
      },
      { status: Number(error?.status || 500) }
    );
  }
}
