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
    if (actor.isAdmin) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const roomId = String(body.roomId || "");
    if (!roomId) {
      return NextResponse.json(
        { ok: false, error: "roomId is required." },
        { status: 400 }
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

    const { error } = await client
      .from("chat_read_receipts")
      .upsert(
        {
          room_id: roomId,
          user_id: actor.userId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "room_id,user_id" }
      );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Read receipt failed." },
      { status: Number(error?.status || 500) }
    );
  }
}
