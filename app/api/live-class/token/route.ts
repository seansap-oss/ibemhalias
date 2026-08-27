import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server-session";
import { liveService } from "@/lib/live-class/server";
import { hmsConfigStatus } from "@/lib/live-class/hms-server";
import { create100msJoinToken } from "@/lib/live-class/providers/100ms";
import { normalizeLiveProvider } from "@/lib/live-class/providers";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const classId =
      request.nextUrl.searchParams.get("classId") || "";
    const teacherMode =
      request.nextUrl.searchParams.get("mode") === "teacher";

    if (!classId) {
      return NextResponse.json(
        { ok: false, error: "classId is required." },
        { status: 400 }
      );
    }

    const service = liveService();
    const { data: liveClass, error } = await service
      .from("live_classes")
      .select(
        "id,title,topic,faculty_name,provider,provider_room_id,status"
      )
      .eq("id", classId)
      .single();
    if (error) throw error;

    if (normalizeLiveProvider(liveClass.provider) !== "100ms") {
      return NextResponse.json(
        { ok: false, error: "This class is not using the 100ms provider." },
        { status: 409 }
      );
    }

    if (!liveClass.provider_room_id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This class has not been provisioned on 100ms yet.",
          config: hmsConfigStatus(),
        },
        { status: 503 }
      );
    }

    let userId = "";
    let userName = "";
    let role = "student";

    if (teacherMode) {
      const adminToken = request.cookies.get(
        getAdminCookieName()
      )?.value;
      const admin = await verifyAdminSessionToken(adminToken);
      if (!admin) {
        return NextResponse.json(
          { ok: false, error: "ADMIN_REQUIRED" },
          { status: 401 }
        );
      }
      userId = `admin-${admin.email}`;
      userName =
        liveClass.faculty_name || "Ibemhal IAS Teacher";
      role = "teacher";
    } else {
      const session = await createSessionClient();
      const {
        data: { user },
      } = await session.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { ok: false, error: "UNAUTHENTICATED" },
          { status: 401 }
        );
      }

      const [
        { data: assignment },
        { data: profile },
      ] = await Promise.all([
        service
          .from("live_class_assignments")
          .select("id")
          .eq("live_class_id", classId)
          .eq("student_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
        service
          .from("profiles")
          .select("full_name,student_code")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (!assignment) {
        return NextResponse.json(
          { ok: false, error: "ACCESS_DENIED" },
          { status: 403 }
        );
      }

      userId = user.id;
      userName =
        profile?.full_name ||
        profile?.student_code ||
        "Student";
    }

    const joined = await create100msJoinToken({
      roomName: liveClass.provider_room_id,
      userId,
      displayName: userName,
      role: role as "teacher" | "student",
    });

    return NextResponse.json({
      ok: true,
      roomId: joined.roomName,
      userName: joined.userName,
      role: joined.role,
      authToken: joined.token,
      config: hmsConfigStatus(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to create live-class token.",
      },
      { status: Number(error?.status || 500) }
    );
  }
}
