import { NextRequest, NextResponse } from "next/server";
import { teacherService } from "@/lib/teacher/server";
import { requireZoomHostForClass } from "@/lib/zoom/host-access";
import { loadZoomClassMetadata } from "@/lib/zoom/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const classId = String(body?.classId || "").trim();
    if (!classId || body?.action !== "started") return NextResponse.json({ ok: false, error: "Invalid class state request." }, { status: 400 });
    await requireZoomHostForClass(classId);
    const service = teacherService();
    const metadata = await loadZoomClassMetadata(service, classId);
    if (!metadata) return NextResponse.json({ ok: false, error: "Zoom room not found." }, { status: 409 });
    const { data, error } = await service.from("live_classes").update({ status: "live", updated_at: new Date().toISOString() }).eq("id", classId).eq("status", "scheduled").select("id").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, changed: Boolean(data) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Unable to update class state." }, { status: Number(error?.status || 500) });
  }
}
