import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: authData } = await session.auth.getUser();
    const user = authData.user;
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

    const body = await request.json();
    const contentId = String(body.contentId || "");
    const action = String(body.action || "");
    if (!contentId) return NextResponse.json({ ok: false, error: "contentId required" }, { status: 400 });

    const service = createCmsServiceClient();
    const { data: existing } = await service.from("student_material_progress").select("*").eq("user_id", user.id).eq("content_id", contentId).maybeSingle();

    const now = new Date().toISOString();
    const next: Record<string, any> = {
      user_id: user.id,
      content_id: contentId,
      progress_percent: Number(existing?.progress_percent || 0),
      completed: Boolean(existing?.completed),
      bookmarked: Boolean(existing?.bookmarked),
      last_opened_at: existing?.last_opened_at || null,
      study_seconds: Number(existing?.study_seconds || 0),
      updated_at: now,
    };

    if (action === "open") {
      next.last_opened_at = now;
      if (next.progress_percent < 5) next.progress_percent = 5;
    } else if (action === "bookmark") {
      next.bookmarked = !next.bookmarked;
    } else if (action === "complete") {
      next.completed = true;
      next.progress_percent = 100;
      next.last_opened_at = now;
    } else if (action === "progress") {
      next.progress_percent = Math.max(0, Math.min(100, Number(body.progressPercent || 0)));
      next.completed = next.progress_percent >= 100;
      next.last_opened_at = now;
      next.study_seconds = Math.max(0, next.study_seconds + Number(body.studySecondsDelta || 0));
    } else {
      return NextResponse.json({ ok: false, error: "Unknown progress action." }, { status: 400 });
    }

    const { data, error } = await service.from("student_material_progress").upsert(next, { onConflict: "user_id,content_id" }).select("*").single();
    if (error) throw error;

    return NextResponse.json({ ok: true, progress: data });
  } catch (error: any) {
    console.error("Student material progress error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unable to update material progress." }, { status: 500 });
  }
}
