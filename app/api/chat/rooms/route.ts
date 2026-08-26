import { NextRequest, NextResponse } from "next/server";
import {
  canAccessChatRoom,
  chatActor,
  chatService,
  ensureLiveClassChatRoom,
} from "@/lib/chat/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actor = await chatActor(request);
    if (!actor) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const client = chatService();
    const classId = request.nextUrl.searchParams.get("classId");
    let rows: any[] = [];

    if (classId) {
      const room = await ensureLiveClassChatRoom(client, classId);
      if (!(await canAccessChatRoom(client, actor, room))) {
        return NextResponse.json({ ok: false, error: "ACCESS_DENIED" }, { status: 403 });
      }
      rows = [room];
    } else {
      const { data, error } = await client
        .from("chat_rooms")
        .select("*")
        .eq("room_type", "community")
        .order("sort_order");
      if (error) throw error;
      rows = data || [];
    }

    let receipts: any[] = [];
    if (!actor.isAdmin) {
      const { data } = await client
        .from("chat_read_receipts")
        .select("room_id,last_read_at")
        .eq("user_id", actor.userId);
      receipts = data || [];
    }
    const readMap = new Map(receipts.map((x: any) => [x.room_id, x.last_read_at]));

    const rooms = [];
    for (const room of rows) {
      if (!(await canAccessChatRoom(client, actor, room))) continue;
      let unread = 0;
      if (!actor.isAdmin) {
        const last = readMap.get(room.id) || "1970-01-01T00:00:00.000Z";
        const { count } = await client
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", room.id)
          .eq("is_deleted", false)
          .gt("created_at", last);
        unread = count || 0;
      }
      rooms.push({ ...room, unread });
    }

    return NextResponse.json({ ok: true, actor, rooms });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to load chat rooms." },
      { status: Number(error?.status || 500) }
    );
  }
}
