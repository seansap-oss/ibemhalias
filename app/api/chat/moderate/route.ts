import { NextRequest, NextResponse } from "next/server";
import { chatActor, chatService } from "@/lib/chat/server";

export async function POST(request: NextRequest) {
  try {
    const actor = await chatActor(request);
    if (!actor || !actor.isAdmin) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = String(body.action || "");
    const client = chatService();

    if (action === "pin") {
      const { error } = await client
        .from("chat_messages")
        .update({
          is_pinned: Boolean(body.pinned),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.messageId);
      if (error) throw error;
    } else if (action === "delete") {
      const { error } = await client
        .from("chat_messages")
        .update({
          is_deleted: true,
          body: "Message removed by admin",
          attachment_path: null,
          external_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.messageId);
      if (error) throw error;
    } else if (action === "room_read_only") {
      const { error } = await client
        .from("chat_rooms")
        .update({
          is_read_only: Boolean(body.readOnly),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.roomId);
      if (error) throw error;
    } else if (action === "slow_mode") {
      const seconds = Math.max(
        0,
        Math.min(300, Number(body.seconds || 0))
      );
      const { error } = await client
        .from("chat_rooms")
        .update({
          slow_mode_seconds: seconds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.roomId);
      if (error) throw error;
    } else if (action === "mute") {
      const minutes = Math.max(
        1,
        Math.min(10080, Number(body.minutes || 60))
      );
      const { error } = await client
        .from("chat_moderation")
        .upsert(
          {
            room_id: body.roomId,
            user_id: body.userId,
            muted_until: new Date(
              Date.now() + minutes * 60000
            ).toISOString(),
            banned: false,
            reason: String(body.reason || "Admin moderation").slice(0, 200),
            updated_by_email: actor.username,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "room_id,user_id" }
        );
      if (error) throw error;
    } else if (action === "unmute") {
      const { error } = await client
        .from("chat_moderation")
        .delete()
        .eq("room_id", body.roomId)
        .eq("user_id", body.userId);
      if (error) throw error;
    } else {
      return NextResponse.json(
        { ok: false, error: "Unknown moderation action." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Moderation failed." },
      { status: Number(error?.status || 500) }
    );
  }
}
