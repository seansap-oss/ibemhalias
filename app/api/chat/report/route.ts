import { NextRequest, NextResponse } from "next/server";
import { canAccessChatRoom, chatActor, chatService } from "@/lib/chat/server";

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
    const messageId = String(body.messageId || "");
    if (!messageId) {
      return NextResponse.json(
        { ok: false, error: "messageId is required." },
        { status: 400 }
      );
    }

    const client = chatService();

    const { data: message, error: messageError } =
      await client
        .from("chat_messages")
        .select("room_id")
        .eq("id", messageId)
        .single();
    if (messageError) throw messageError;

    const { data: room, error: roomError } =
      await client
        .from("chat_rooms")
        .select("*")
        .eq("id", message.room_id)
        .single();
    if (roomError) throw roomError;

    if (!(await canAccessChatRoom(client, actor, room))) {
      return NextResponse.json(
        { ok: false, error: "ACCESS_DENIED" },
        { status: 403 }
      );
    }

    const reporterKey = actor.isAdmin
      ? `admin:${actor.username}`
      : actor.userId;

    const { error } = await client
      .from("chat_reports")
      .insert({
        message_id: messageId,
        reporter_user_id: actor.isAdmin ? null : actor.userId,
        reporter_key: reporterKey,
        reason: String(body.reason || "inappropriate").slice(0, 80),
        details: String(body.details || "").slice(0, 500) || null,
      });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Report failed." },
      { status: Number(error?.status || 500) }
    );
  }
}
