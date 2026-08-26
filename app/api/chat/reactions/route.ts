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
    const emoji = String(body.emoji || "").slice(0, 16);
    if (!messageId || !emoji) {
      return NextResponse.json(
        { ok: false, error: "messageId and emoji are required." },
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

    const actorKey = actor.isAdmin
      ? `admin:${actor.username}`
      : actor.userId;

    const { data: existing } = await client
      .from("chat_reactions")
      .select("message_id")
      .eq("message_id", messageId)
      .eq("actor_key", actorKey)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      const { error } = await client
        .from("chat_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("actor_key", actorKey)
        .eq("emoji", emoji);
      if (error) throw error;
    } else {
      const { error } = await client
        .from("chat_reactions")
        .insert({
          message_id: messageId,
          user_id: actor.isAdmin ? null : actor.userId,
          actor_key: actorKey,
          emoji,
        });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, active: !existing });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Reaction failed." },
      { status: Number(error?.status || 500) }
    );
  }
}
