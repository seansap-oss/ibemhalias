import { NextRequest, NextResponse } from "next/server";
import {
  requireLiveAdmin,
  liveService,
} from "@/lib/live-class/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

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
      const mime = String(body.mime || "");
      const size = Number(body.size || 0);

      if (!fileName || !mime || !size) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "fileName, mime and size are required.",
          },
          { status: 400 }
        );
      }
      if (size > MAX_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            error: "Maximum file size is 50 MB.",
          },
          { status: 413 }
        );
      }
      if (!ALLOWED.has(mime)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Unsupported class resource type.",
          },
          { status: 415 }
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
      });
    }

    if (action === "commit") {
      const path = String(body.path || "");
      const title = String(body.title || "").slice(0, 240);
      const mime = String(body.mime || "");
      const size = Number(body.size || 0);
      const resourceType = String(
        body.resourceType || "pdf"
      );

      if (!path || !title || !mime || !size) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "path, title, mime and size are required.",
          },
          { status: 400 }
        );
      }
      if (
        !path.startsWith(
          `live-classes/${classId}/`
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid resource path.",
          },
          { status: 400 }
        );
      }

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
          sort_order: 0,
        })
        .select("*")
        .single();
      if (error) throw error;

      return NextResponse.json({
        ok: true,
        resource: data,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unknown resource action.",
      },
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
    const id =
      request.nextUrl.searchParams.get("id") || "";
    const client = liveService();

    const { data } = await client
      .from("live_class_resources")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (data?.storage_path) {
      await client.storage
        .from("cms-content")
        .remove([data.storage_path]);
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
