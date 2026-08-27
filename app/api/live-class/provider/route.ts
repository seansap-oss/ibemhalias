import { NextRequest, NextResponse } from "next/server";
import { requireLiveAdmin, liveService } from "@/lib/live-class/server";
import { liveKitConfigStatus } from "@/lib/live-class/providers/livekit";

export const dynamic = "force-dynamic";

function roomSettingKey(classId: string) {
  return `provider_room:livekit:${classId}`;
}

async function saveLiveKitRoom(client: any, classId: string, roomId: string) {
  const { error } = await client.from("live_class_settings").upsert(
    {
      key: roomSettingKey(classId),
      value: roomId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw error;
}

async function loadLiveKitRoom(client: any, classId: string) {
  const { data } = await client
    .from("live_class_settings")
    .select("value")
    .eq("key", roomSettingKey(classId))
    .maybeSingle();
  return String(data?.value || "").trim();
}

async function ensureLiveKitRoom(client: any, liveClass: any) {
  const classId = String(liveClass.id || "").trim();
  const storedProvider = String(liveClass.provider || "").toLowerCase();
  const existingLiveKitId =
    storedProvider === "livekit" ? String(liveClass.provider_room_id || "").trim() : "";

  const roomId =
    existingLiveKitId ||
    (await loadLiveKitRoom(client, classId)) ||
    `ibemhal-${classId}`;

  await saveLiveKitRoom(client, classId, roomId);

  if (storedProvider !== "livekit" || String(liveClass.provider_room_id || "") !== roomId) {
    const { error } = await client
      .from("live_classes")
      .update({
        provider: "livekit",
        provider_room_id: roomId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classId);
    if (error) throw error;
  }

  return roomId;
}

async function signedResources(client: any, classId: string) {
  const { data: resourceRows } = await client
    .from("live_class_resources")
    .select("*")
    .eq("live_class_id", classId)
    .order("sort_order");

  const resources = [];
  for (const resource of resourceRows || []) {
    let url = resource.external_url || null;
    if (!url && resource.storage_path) {
      const { data: signed } = await client.storage
        .from("cms-content")
        .createSignedUrl(resource.storage_path, 21600);
      url = signed?.signedUrl || null;
    }
    resources.push({ ...resource, url });
  }
  return resources;
}

export async function GET(request: NextRequest) {
  try {
    await requireLiveAdmin();
    const classId = request.nextUrl.searchParams.get("classId") || "";
    const client = liveService();

    const { data: liveClass, error } = await client
      .from("live_classes")
      .select("*")
      .eq("id", classId)
      .single();
    if (error) throw error;

    const roomId = await ensureLiveKitRoom(client, liveClass);
    const resources = await signedResources(client, classId);
    const config = liveKitConfigStatus();

    return NextResponse.json({
      ok: true,
      liveClass: {
        ...liveClass,
        provider: "livekit",
        provider_room_id: roomId,
        resources,
      },
      config: {
        current: "livekit",
        providers: { livekit: config },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to load Live Now classroom." },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireLiveAdmin();
    const body = await request.json();
    const action = String(body.action || "");
    const classId = String(body.classId || "").trim();
    const client = liveService();

    if (!classId) {
      return NextResponse.json({ ok: false, error: "classId is required." }, { status: 400 });
    }

    const { data: liveClass, error } = await client
      .from("live_classes")
      .select("*")
      .eq("id", classId)
      .single();
    if (error) throw error;

    if (action === "set_provider") {
      const requestedProvider = String(body.provider || "livekit").toLowerCase();
      if (requestedProvider !== "livekit") {
        return NextResponse.json(
          {
            ok: false,
            error: "The legacy live provider is temporarily disabled. Ibemhal IAS is using Live Now.",
          },
          { status: 409 }
        );
      }

      const roomId = await ensureLiveKitRoom(client, liveClass);
      return NextResponse.json({
        ok: true,
        provider: "livekit",
        roomId,
        config: { livekit: liveKitConfigStatus() },
      });
    }

    if (action === "provision") {
      const roomId = await ensureLiveKitRoom(client, liveClass);
      return NextResponse.json({
        ok: true,
        provider: "livekit",
        roomId,
        joinPath: `/live-classes/${classId}`,
      });
    }

    if (action === "set_status") {
      const status = String(body.status || "scheduled");
      if (!["scheduled", "live", "completed", "cancelled"].includes(status)) {
        throw Object.assign(new Error("Invalid class status."), { status: 400 });
      }
      const { error: statusError } = await client
        .from("live_classes")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", classId);
      if (statusError) throw statusError;
      return NextResponse.json({ ok: true, status });
    }

    if (action === "record_start" || action === "record_stop") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Live Now currently uses local teacher recording. Server recording will be added when a production LiveKit deployment is configured.",
        },
        { status: 409 }
      );
    }

    throw Object.assign(new Error("Unknown Live Now action."), { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Live Now action failed." },
      { status: Number(error?.status || 500) }
    );
  }
}
