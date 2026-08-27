import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server-session";
import { liveService } from "@/lib/live-class/server";
import { createLiveKitJoinToken, getLiveKitParticipantCount, liveKitConfigStatus } from "@/lib/live-class/providers/livekit";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";
import { requireLiveNowLicense } from "@/lib/live-now/license";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function roomSettingKey(classId: string) {
  return `provider_room:livekit:${classId}`;
}

async function ensureLiveKitRoom(service: any, liveClass: any) {
  const classId = String(liveClass.id || "").trim();
  const storedProvider = String(liveClass.provider || "").toLowerCase();
  let roomName =
    storedProvider === "livekit" ? String(liveClass.provider_room_id || "").trim() : "";

  if (!roomName) {
    const { data: setting } = await service
      .from("live_class_settings")
      .select("value")
      .eq("key", roomSettingKey(classId))
      .maybeSingle();
    roomName = String(setting?.value || "").trim();
  }

  if (!roomName) roomName = `ibemhal-${classId}`;

  const { error: settingError } = await service.from("live_class_settings").upsert(
    {
      key: roomSettingKey(classId),
      value: roomName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (settingError) throw settingError;

  if (storedProvider !== "livekit" || String(liveClass.provider_room_id || "") !== roomName) {
    const { error: updateError } = await service
      .from("live_classes")
      .update({
        provider: "livekit",
        provider_room_id: roomName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classId);
    if (updateError) throw updateError;
  }

  return roomName;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const classId = String(body?.classId || "").trim();
    if (!classId) {
      return NextResponse.json({ ok: false, error: "classId is required." }, { status: 400 });
    }

    const license = await requireLiveNowLicense({
      classId,
      origin: request.nextUrl.origin,
    });

    const service = liveService();
    const { data: liveClass, error } = await service
      .from("live_classes")
      .select("id,title,topic,faculty_name,provider,provider_room_id,status")
      .eq("id", classId)
      .single();
    if (error) throw error;

    let userId = "";
    let displayName = "";
    let role: "teacher" | "student" = "student";

    const adminToken = request.cookies.get(getAdminCookieName())?.value;
    const admin = await verifyAdminSessionToken(adminToken);

    if (admin) {
      role = "teacher";
      userId = `admin-${admin.email}`;
      displayName = liveClass.faculty_name || "Ibemhal IAS Teacher";
    } else {
      const session = await createSessionClient();
      const {
        data: { user },
      } = await session.auth.getUser();

      if (!user) {
        return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
      }

      const [{ data: assignment }, { data: profile }] = await Promise.all([
        service
          .from("live_class_assignments")
          .select("id")
          .eq("live_class_id", classId)
          .eq("student_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
        service
          .from("profiles")
          .select("full_name,student_code,email")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (!assignment) {
        return NextResponse.json({ ok: false, error: "ACCESS_DENIED" }, { status: 403 });
      }

      userId = user.id;
      displayName = profile?.full_name || profile?.student_code || profile?.email || "Student";
    }

    const config = liveKitConfigStatus();
    if (!config.configured) {
      return NextResponse.json(
        {
          ok: false,
          provider: "livekit",
          error: `Live Now is not configured correctly: ${config.missing.join(", ")}`,
          config,
        },
        { status: 503 }
      );
    }

    const roomName = await ensureLiveKitRoom(service, liveClass);

    if (role === "student") {
      const participantCount = await getLiveKitParticipantCount(roomName);
      if (participantCount >= license.maxParticipants) {
        return NextResponse.json(
          {
            ok: false,
            error: `This Live Now license allows up to ${license.maxParticipants} participants in one class.`,
            license,
          },
          { status: 403 }
        );
      }
    }

    const joined = await createLiveKitJoinToken({
      roomName,
      userId,
      displayName,
      role,
    });

    return NextResponse.json({ ok: true, ...joined, config, license });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to create Live Now room token." },
      { status: Number(error?.status || 500) }
    );
  }
}
