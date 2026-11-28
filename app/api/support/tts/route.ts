import { NextRequest, NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import {
  normalizeAccent,
  normalizeGender,
  normalizeRate,
  synthesizeMicrosoftSpeech,
} from "@/lib/tts/microsoft-voices";

export const runtime = "nodejs";
export const maxDuration = 30;

async function getSavedVoiceDefaults() {
  try {
    const db = createCmsServiceClient();
    const { data } = await db
      .from("cms_content")
      .select("description")
      .eq("section_path", "support-concierge-config")
      .order("created_at", { ascending: false })
      .limit(1);

    const raw = data?.[0]?.description;
    if (!raw) return {};
    return JSON.parse(raw) as {
      voiceAccent?: string;
      voiceGender?: string;
      voiceRate?: string;
    };
  } catch {
    return {};
  }
}

async function handleTts(
  text: string,
  accentInput?: unknown,
  genderInput?: unknown,
  rateInput?: unknown
) {
  const clean = String(text || "").trim();
  if (!clean) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const defaults = await getSavedVoiceDefaults();
  const accent = normalizeAccent(accentInput || defaults.voiceAccent);
  const gender = normalizeGender(genderInput || defaults.voiceGender);
  const rate = normalizeRate(rateInput || defaults.voiceRate);

  const { buffer, voiceName } = await synthesizeMicrosoftSpeech({
    text: clean,
    accent,
    gender,
    rate,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.byteLength),
      "X-TTS-Voice": voiceName,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await handleTts(body?.text, body?.accent, body?.gender, body?.rate);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Microsoft TTS synthesis failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    return await handleTts(
      sp.get("text") || "",
      sp.get("accent"),
      sp.get("gender"),
      sp.get("rate")
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Microsoft TTS synthesis failed" },
      { status: 500 }
    );
  }
}
