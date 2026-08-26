import { NextRequest, NextResponse } from "next/server";
import {
  requireLiveAdmin,
  liveService,
} from "@/lib/live-class/server";
import {
  createHmsRoom,
  createIbemhalTemplate,
  hmsConfigStatus,
  startHmsRecording,
  stopHmsRecording,
} from "@/lib/live-class/hms-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireLiveAdmin();
    const classId =
      request.nextUrl.searchParams.get("classId") || "";
    const client = liveService();

    const [
      { data: liveClass, error },
      { data: resourceRows },
    ] = await Promise.all([
      client
        .from("live_classes")
        .select("*")
        .eq("id", classId)
        .single(),
      client
        .from("live_class_resources")
        .select("*")
        .eq("live_class_id", classId)
        .order("sort_order"),
    ]);
    if (error) throw error;

    const resources = [];
    for (const resource of resourceRows || []) {
      let url = resource.external_url || null;
      if (!url && resource.storage_path) {
        const { data: signed } = await client.storage
          .from("cms-content")
          .createSignedUrl(resource.storage_path, 3600);
        url = signed?.signedUrl || null;
      }
      resources.push({ ...resource, url });
    }

    return NextResponse.json({
      ok: true,
      liveClass: { ...liveClass, resources },
      config: hmsConfigStatus(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message || "Unable to load provider.",
      },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireLiveAdmin();
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

    const { data: liveClass, error } = await client
      .from("live_classes")
      .select("*")
      .eq("id", classId)
      .single();
    if (error) throw error;

    if (action === "provision") {
      let templateId =
        process.env.HMS_TEMPLATE_ID?.trim() || "";

      if (!templateId) {
        const { data: setting } = await client
          .from("live_class_settings")
          .select("value")
          .eq("key", "hms_template_id")
          .maybeSingle();
        templateId = String(setting?.value || "");
      }

      if (!templateId) {
        const template = await createIbemhalTemplate();
        templateId = String(
          template.id || template._id || ""
        );
        if (!templateId) {
          throw new Error(
            "100ms template creation did not return an id."
          );
        }
        const { error: settingError } = await client
          .from("live_class_settings")
          .upsert(
            {
              key: "hms_template_id",
              value: templateId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "key" }
          );
        if (settingError) throw settingError;
      }

      let roomId = String(
        liveClass.provider_room_id || ""
      );

      if (!roomId) {
        const room = await createHmsRoom({
          name: `ibemhal-${classId}`,
          description: `${liveClass.title} - ${liveClass.topic}`,
          templateId,
          capacity: Number(liveClass.capacity || 500),
        });
        roomId = String(room.id || "");
        if (!roomId) {
          throw new Error(
            "100ms room creation did not return an id."
          );
        }

        const { error: updateError } = await client
          .from("live_classes")
          .update({
            provider: "100ms",
            provider_room_id: roomId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", classId);
        if (updateError) throw updateError;
      }

      return NextResponse.json({
        ok: true,
        roomId,
        templateId,
        joinPath: `/live-classes/${classId}`,
      });
    }

    if (!liveClass.provider_room_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Provision the 100ms room first.",
        },
        { status: 409 }
      );
    }

    if (action === "record_start") {
      const result = await startHmsRecording(
        liveClass.provider_room_id
      );
      return NextResponse.json({ ok: true, result });
    }

    if (action === "record_stop") {
      const result = await stopHmsRecording(
        liveClass.provider_room_id
      );
      return NextResponse.json({ ok: true, result });
    }

    if (action === "set_status") {
      const status = String(
        body.status || "scheduled"
      );
      if (
        ![
          "scheduled",
          "live",
          "completed",
          "cancelled",
        ].includes(status)
      ) {
        throw Object.assign(
          new Error("Invalid class status."),
          { status: 400 }
        );
      }
      const { error: statusError } = await client
        .from("live_classes")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", classId);
      if (statusError) throw statusError;

      return NextResponse.json({ ok: true, status });
    }

    throw Object.assign(
      new Error("Unknown provider action."),
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "100ms provider action failed.",
      },
      { status: Number(error?.status || 500) }
    );
  }
}
