import { NextRequest, NextResponse } from "next/server";
import {
  canAccessChatRoom,
  chatActor,
  chatService,
} from "@/lib/chat/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function attachmentType(mime: string) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export async function POST(request: NextRequest) {
  try {
    const actor = await chatActor(request);
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const roomId = String(body.roomId || "");
    const fileName = String(body.fileName || "");
    const mime = String(body.mime || "");
    const size = Number(body.size || 0);

    if (!roomId || !fileName || !mime || !size) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "roomId, fileName, mime and size are required.",
        },
        { status: 400 }
      );
    }

    if (size > MAX_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "Maximum attachment size is 50 MB.",
        },
        { status: 413 }
      );
    }

    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported attachment type.",
        },
        { status: 415 }
      );
    }

    const client = chatService();
    const { data: room, error: roomError } =
      await client
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .single();
    if (roomError) throw roomError;

    if (!(await canAccessChatRoom(client, actor, room))) {
      return NextResponse.json(
        { ok: false, error: "ACCESS_DENIED" },
        { status: 403 }
      );
    }

    const safeName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-120);
    const path = `${roomId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { data: signed, error: signError } =
      await client.storage
        .from("chat-media")
        .createSignedUploadUrl(path);
    if (signError) throw signError;

    return NextResponse.json({
      ok: true,
      upload: {
        bucket: "chat-media",
        path,
        token: signed.token,
        type: attachmentType(mime),
        name: fileName,
        mime,
        size,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to prepare attachment upload.",
      },
      { status: Number(error?.status || 500) }
    );
  }
}
