import { NextRequest, NextResponse } from "next/server";
import { adminError, liveService, requireLiveAdmin } from "@/lib/live-class/server";

export const dynamic = "force-dynamic";

function resourceType(mime: string, fileName: string) {
  const lower = fileName.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "notes";
}

export async function POST(request: NextRequest) {
  try {
    await requireLiveAdmin();
    const client = liveService();
    const form = await request.formData();
    const liveClassId = String(form.get("liveClassId") || "");
    const file = form.get("file");
    const externalUrl = String(form.get("externalUrl") || "").trim();
    const title = String(form.get("title") || "").trim();
    if (!liveClassId) throw Object.assign(new Error("liveClassId required"), { status: 400 });

    if (file instanceof File && file.size > 0) {
      if (file.size > 200 * 1024 * 1024) throw Object.assign(new Error("File exceeds 200 MB limit."), { status: 400 });
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `live-classes/${liveClassId}/${Date.now()}-${cleanName}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: uploadError } = await client.storage.from("cms-content").upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) throw uploadError;
      const { data, error } = await client.from("live_class_resources").insert({ live_class_id: liveClassId, title: title || file.name, resource_type: resourceType(file.type, file.name), storage_path: storagePath }).select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, resource: data });
    }

    if (externalUrl) {
      const { data, error } = await client.from("live_class_resources").insert({ live_class_id: liveClassId, title: title || "External resource", resource_type: "link", external_url: externalUrl }).select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, resource: data });
    }

    throw Object.assign(new Error("Choose a file or enter an external URL."), { status: 400 });
  } catch (error) {
    return adminError(error);
  }
}
