import { NextRequest, NextResponse } from "next/server";
import {
  currentStudent,
  liveService,
} from "@/lib/live-class/server";

export const dynamic = "force-dynamic";
type AnyRow = Record<string, any>;

export async function GET(request: NextRequest) {
  const user = await currentStudent();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const client = liveService();
  await client.rpc("sync_live_class_assignments", {
    p_class_id: null,
    p_student_id: user.id,
  });

  const classId =
    request.nextUrl.searchParams.get("classId");

  const [
    { data: profile },
    { data: assignments, error },
    { data: classes },
    { data: resources },
  ] = await Promise.all([
    client
      .from("profiles")
      .select(
        "id,student_code,full_name,email,phone,whatsapp_opt_in,tier,chat_username"
      )
      .eq("id", user.id)
      .single(),
    client
      .from("live_class_assignments")
      .select(
        "live_class_id,status,source,access_pass_id"
      )
      .eq("student_id", user.id)
      .eq("status", "active"),
    client
      .from("live_classes")
      .select(
        "id,title,topic,faculty_name,starts_at,ends_at,status,recording_url,join_url,hls_url,provider,provider_room_id,room_id,capacity"
      )
      .order("starts_at"),
    client
      .from("live_class_resources")
      .select(
        "id,live_class_id,title,resource_type,storage_path,external_url,sort_order,mime_type,file_size"
      )
      .order("sort_order"),
  ]);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const signedResources: AnyRow[] = [];
  for (const resource of resources || []) {
    let url = resource.external_url || null;
    if (!url && resource.storage_path) {
      const { data: signed } = await client.storage
        .from("cms-content")
        .createSignedUrl(resource.storage_path, 3600);
      url = signed?.signedUrl || null;
    }
    signedResources.push({ ...resource, url });
  }

  const assignmentMap = new Map(
    (assignments || []).map((assignment: AnyRow) => [
      assignment.live_class_id,
      assignment,
    ])
  );

  const visible = (classes || []).filter(
    (liveClass: AnyRow) =>
      assignmentMap.has(liveClass.id)
  );

  const enriched = visible.map((liveClass: AnyRow) => ({
    ...liveClass,
    access: assignmentMap.get(liveClass.id),
    resources: signedResources.filter(
      (resource: AnyRow) =>
        resource.live_class_id === liveClass.id
    ),
  }));

  if (classId) {
    const liveClass = enriched.find(
      (item: AnyRow) => item.id === classId
    );
    if (!liveClass) {
      return NextResponse.json(
        {
          ok: false,
          allowed: false,
          error:
            "You do not have access to this class.",
        },
        { status: 403 }
      );
    }
    return NextResponse.json({
      ok: true,
      allowed: true,
      profile,
      liveClass,
    });
  }

  return NextResponse.json({
    ok: true,
    profile,
    classes: enriched,
  });
}

export async function POST(request: NextRequest) {
  const user = await currentStudent();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const classId = String(body.classId || "");
  const event = String(body.event || "");

  if (
    !classId ||
    !["join", "leave"].includes(event)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid attendance event.",
      },
      { status: 400 }
    );
  }

  const client = liveService();
  const { data: assignment } = await client
    .from("live_class_assignments")
    .select("id")
    .eq("student_id", user.id)
    .eq("live_class_id", classId)
    .eq("status", "active")
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json(
      { ok: false, error: "ACCESS_DENIED" },
      { status: 403 }
    );
  }

  const now = new Date();
  const { data: existing } = await client
    .from("live_class_attendance")
    .select("*")
    .eq("student_id", user.id)
    .eq("live_class_id", classId)
    .maybeSingle();

  if (event === "join") {
    const row = {
      live_class_id: classId,
      student_id: user.id,
      first_join_at:
        existing?.first_join_at ||
        now.toISOString(),
      last_join_at: now.toISOString(),
      join_count:
        Number(existing?.join_count || 0) + 1,
      status: "present",
      updated_at: now.toISOString(),
    };

    const { error } = await client
      .from("live_class_attendance")
      .upsert(row, {
        onConflict: "live_class_id,student_id",
      });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
  } else {
    const lastJoin = existing?.last_join_at
      ? new Date(existing.last_join_at)
      : now;
    const delta = Math.max(
      0,
      Math.round(
        (now.getTime() - lastJoin.getTime()) /
          1000
      )
    );

    const { error } = await client
      .from("live_class_attendance")
      .upsert(
        {
          live_class_id: classId,
          student_id: user.id,
          first_join_at:
            existing?.first_join_at ||
            lastJoin.toISOString(),
          last_join_at:
            existing?.last_join_at ||
            lastJoin.toISOString(),
          last_leave_at: now.toISOString(),
          join_count: Number(
            existing?.join_count || 1
          ),
          watch_seconds:
            Number(existing?.watch_seconds || 0) +
            delta,
          status: "present",
          updated_at: now.toISOString(),
        },
        {
          onConflict:
            "live_class_id,student_id",
        }
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
