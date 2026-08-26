import { NextRequest, NextResponse } from "next/server";
import {
  canAccessChatRoom,
  chatActor,
  chatService,
  signedChatAttachment,
} from "@/lib/chat/server";

export const dynamic = "force-dynamic";

async function roomFor(client: any, roomId: string) {
  const { data, error } = await client
    .from("chat_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  if (error) throw error;
  return data;
}

function validUrl(value: string) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function classifyExternalUrl(value: string) {
  if (!value) return null;
  if (/youtu\.be|youtube\.com/i.test(value)) return "youtube";
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(value)) return "video";
  return "link";
}

export async function GET(request: NextRequest) {
  try {
    const actor = await chatActor(request);
    if (!actor) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    const roomId = request.nextUrl.searchParams.get("roomId") || "";
    if (!roomId) return NextResponse.json({ ok: false, error: "roomId required" }, { status: 400 });

    const client = chatService();
    const room = await roomFor(client, roomId);
    if (!(await canAccessChatRoom(client, actor, room))) {
      return NextResponse.json({ ok: false, error: "ACCESS_DENIED" }, { status: 403 });
    }

    const before = request.nextUrl.searchParams.get("before");
    let query = client
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(80);
    if (before) query = query.lt("created_at", before);

    const { data: messageRows, error } = await query;
    if (error) throw error;
    const messages = [...(messageRows || [])].reverse();

    const ids = messages.map((m: any) => m.id);
    const replyIds = [...new Set(messages.map((m: any) => m.reply_to).filter(Boolean))];
    const [{ data: reactions }, { data: replies }] = await Promise.all([
      ids.length
        ? client.from("chat_reactions").select("*").in("message_id", ids)
        : Promise.resolve({ data: [] }),
      replyIds.length
        ? client.from("chat_messages").select("id,author_name,body,attachment_name").in("id", replyIds)
        : Promise.resolve({ data: [] }),
    ]);

    const reactionMap = new Map<string, any[]>();
    for (const row of reactions || []) {
      const list = reactionMap.get(row.message_id) || [];
      list.push(row);
      reactionMap.set(row.message_id, list);
    }
    const replyMap = new Map((replies || []).map((r: any) => [r.id, r]));

    const enriched = [];
    for (const row of messages) {
      enriched.push({
        ...row,
        attachment_url: await signedChatAttachment(client, row.attachment_path),
        reactions: reactionMap.get(row.id) || [],
        reply: row.reply_to ? replyMap.get(row.reply_to) || null : null,
      });
    }

    const { data: pinned } = await client
      .from("chat_messages")
      .select("id,author_name,body,attachment_name,created_at")
      .eq("room_id", roomId)
      .eq("is_pinned", true)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      actor,
      room,
      messages: enriched,
      pinned: pinned || [],
      hasMore: (messageRows || []).length === 80,
      nextBefore: messages[0]?.created_at || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to load messages." },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await chatActor(request);
    if (!actor) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    const body = await request.json();
    const roomId = String(body.roomId || "");
    const text = String(body.body || "").trim().slice(0, 4000);
    const externalUrl = String(body.externalUrl || "").trim();
    if (!roomId) return NextResponse.json({ ok: false, error: "roomId required" }, { status: 400 });
    if (!text && !body.attachmentPath && !externalUrl) {
      return NextResponse.json({ ok: false, error: "Message is empty." }, { status: 400 });
    }
    if (externalUrl && !validUrl(externalUrl)) {
      return NextResponse.json({ ok: false, error: "Invalid URL." }, { status: 400 });
    }

    const client = chatService();
    const room = await roomFor(client, roomId);
    if (!(await canAccessChatRoom(client, actor, room))) {
      return NextResponse.json({ ok: false, error: "ACCESS_DENIED" }, { status: 403 });
    }
    if (room.is_read_only && !actor.isAdmin && actor.role !== "instructor") {
      return NextResponse.json({ ok: false, error: "This room is read-only." }, { status: 403 });
    }

    if (
      !actor.isAdmin &&
      actor.role === "student" &&
      Number(room.slow_mode_seconds || 0) > 0
    ) {
      const { data: latestOwn } = await client
        .from("chat_messages")
        .select("created_at")
        .eq("room_id", roomId)
        .eq("user_id", actor.userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOwn?.created_at) {
        const remaining =
          Number(room.slow_mode_seconds || 0) * 1000 -
          (Date.now() - new Date(latestOwn.created_at).getTime());
        if (remaining > 0) {
          return NextResponse.json(
            {
              ok: false,
              error: `Slow mode: wait ${Math.ceil(remaining / 1000)} seconds before sending another message.`,
            },
            { status: 429 }
          );
        }
      }
    }

    if (!actor.isAdmin && actor.userId.indexOf("admin:") !== 0) {
      const { data: moderation } = await client
        .from("chat_moderation")
        .select("muted_until,banned")
        .eq("room_id", roomId)
        .eq("user_id", actor.userId)
        .maybeSingle();
      if (moderation?.banned) {
        return NextResponse.json({ ok: false, error: "You are not allowed to post in this room." }, { status: 403 });
      }
      if (moderation?.muted_until && new Date(moderation.muted_until).getTime() > Date.now()) {
        return NextResponse.json({ ok: false, error: "You are temporarily muted in this room." }, { status: 403 });
      }
    }

    const attachmentType =
      body.attachmentType ||
      (externalUrl ? classifyExternalUrl(externalUrl) : null);

    const row = {
      room_id: roomId,
      user_id: actor.isAdmin ? null : actor.userId,
      admin_actor: actor.isAdmin ? actor.username : null,
      author_name: actor.fullName,
      author_username: actor.username,
      author_role: actor.role,
      body: text,
      reply_to: body.replyTo || null,
      attachment_type: attachmentType || null,
      attachment_path: body.attachmentPath || null,
      attachment_name: body.attachmentName || null,
      attachment_mime: body.attachmentMime || null,
      attachment_size: body.attachmentSize || null,
      external_url: externalUrl || null,
    };

    const { data, error } = await client
      .from("chat_messages")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, message: data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to send message." },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await chatActor(request);
    if (!actor) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    const id = request.nextUrl.searchParams.get("id") || "";
    const client = chatService();
    const { data: message } = await client.from("chat_messages").select("*").eq("id", id).single();
    if (!message) return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 });
    const room = await roomFor(client, message.room_id);
    if (!(await canAccessChatRoom(client, actor, room))) {
      return NextResponse.json({ ok: false, error: "ACCESS_DENIED" }, { status: 403 });
    }
    const owns = !actor.isAdmin && message.user_id === actor.userId;
    if (!actor.isAdmin && !owns) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }
    const { error } = await client
      .from("chat_messages")
      .update({
        is_deleted: true,
        body: "Message deleted",
        attachment_path: null,
        external_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Unable to delete message." }, { status: 500 });
  }
}
