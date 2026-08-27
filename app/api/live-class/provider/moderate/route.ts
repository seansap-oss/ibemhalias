import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { requireLiveAdmin, liveService } from "@/lib/live-class/server";
import { requireLiveKitConfig, toLiveKitHttpUrl } from "@/lib/live-class/providers/livekit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HostAction = "kick" | "mute" | "promote" | "demote" | "allow-mic" | "allow-camera";

export async function POST(request: NextRequest) {
  try {
    await requireLiveAdmin();
    const body = await request.json();
    const classId = String(body?.classId || "").trim();
    const target = String(body?.targetIdentity || "").trim();
    const action = String(body?.action || "") as HostAction;
    const trackSid = body?.trackSid ? String(body.trackSid) : "";

    if (!classId || !target) {
      return NextResponse.json({ ok: false, error: "Missing class/participant." }, { status: 400 });
    }

    const client = liveService();
    const { data: liveClass, error } = await client
      .from("live_classes")
      .select("provider,provider_room_id")
      .eq("id", classId)
      .single();
    if (error) throw error;

    const roomName =
      String(liveClass.provider || "").toLowerCase() === "livekit" &&
      String(liveClass.provider_room_id || "").trim()
        ? String(liveClass.provider_room_id).trim()
        : `ibemhal-${classId}`;

    const { url, apiKey, apiSecret } = requireLiveKitConfig();
    const service = new RoomServiceClient(toLiveKitHttpUrl(url), apiKey, apiSecret);

    switch (action) {
      case "kick":
        await service.removeParticipant(roomName, target);
        break;
      case "mute":
        if (!trackSid) {
          return NextResponse.json({ ok: false, error: "No microphone track." }, { status: 400 });
        }
        await service.mutePublishedTrack(roomName, target, trackSid, true);
        break;
      case "promote":
      case "allow-mic":
      case "allow-camera":
        await service.updateParticipant(roomName, target, {
          attributes: { role: "speaker" },
          permission: {
            canSubscribe: true,
            canPublish: true,
            canPublishData: true,
            canUpdateMetadata: false,
            hidden: false,
            recorder: false,
          },
        });
        break;
      case "demote":
        await service.updateParticipant(roomName, target, {
          attributes: { role: "student" },
          permission: {
            canSubscribe: true,
            canPublish: false,
            canPublishData: true,
            canUpdateMetadata: false,
            hidden: false,
            recorder: false,
          },
        });
        break;
      default:
        return NextResponse.json({ ok: false, error: "Unsupported moderation action." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Live Now moderation failed." },
      { status: Number(error?.status || 500) }
    );
  }
}
