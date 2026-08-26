import { NextRequest, NextResponse } from "next/server";
import { requireLiveAdmin } from "@/lib/live-class/server";

export async function POST(request: NextRequest) {
  try {
    await requireLiveAdmin();
    const body = await request.json();
    const scene = String(body.scene || "auto");

    if (
      ![
        "auto",
        "teaching",
        "presentation",
        "off",
      ].includes(scene)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid lighting scene." },
        { status: 400 }
      );
    }

    const url =
      process.env.LIGHTING_CONTROL_WEBHOOK_URL?.trim();

    if (!url) {
      return NextResponse.json({
        ok: true,
        configured: false,
        scene,
        message:
          "Lighting UI is ready; no physical lighting controller webhook is configured.",
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ibemhal-live-class",
        scene,
        classId: body.classId || null,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Lighting controller HTTP ${response.status}`
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      scene,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message || "Lighting control failed.",
      },
      { status: Number(error?.status || 500) }
    );
  }
}
