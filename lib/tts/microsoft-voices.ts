import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export type VoiceAccent = "en-IN" | "en-GB" | "en-US";
export type VoiceGender = "female" | "male";
export type VoiceRate = "0.9" | "1.0" | "1.1";

export const VOICE_CATALOG: Record<
  VoiceAccent,
  Record<VoiceGender, { shortName: string; label: string }>
> = {
  "en-IN": {
    female: { shortName: "en-IN-NeerjaNeural", label: "Neerja (Indian Female)" },
    male: { shortName: "en-IN-PrabhatNeural", label: "Prabhat (Indian Male)" },
  },
  "en-GB": {
    female: { shortName: "en-GB-SoniaNeural", label: "Sonia (UK Female)" },
    male: { shortName: "en-GB-RyanNeural", label: "Ryan (UK Male)" },
  },
  "en-US": {
    female: { shortName: "en-US-JennyNeural", label: "Jenny (American Female)" },
    male: { shortName: "en-US-GuyNeural", label: "Guy (American Male)" },
  },
};

export function normalizeAccent(value: unknown): VoiceAccent {
  if (value === "en-GB" || value === "en-US" || value === "en-IN") return value;
  return "en-IN";
}

export function normalizeGender(value: unknown): VoiceGender {
  return value === "male" ? "male" : "female";
}

export function normalizeRate(value: unknown): VoiceRate {
  if (value === "0.9" || value === "1.1" || value === "1.0") return value;
  return "1.0";
}

export function resolveMicrosoftVoice(accent?: unknown, gender?: unknown) {
  const a = normalizeAccent(accent);
  const g = normalizeGender(gender);
  return VOICE_CATALOG[a][g];
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rateToProsodyPercent(rate: VoiceRate): string {
  if (rate === "0.9") return "-10%";
  if (rate === "1.1") return "+10%";
  return "+0%";
}

async function synthesizeViaAzure(
  text: string,
  voiceName: string,
  locale: VoiceAccent,
  rate: VoiceRate
): Promise<Buffer | null> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return null;

  const ssml = `<speak version="1.0" xml:lang="${locale}"><voice name="${voiceName}"><prosody rate="${rateToProsodyPercent(
    rate
  )}">${escapeXml(text)}</prosody></voice></speak>`;

  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      },
      body: ssml,
    }
  );

  if (!res.ok) return null;
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function synthesizeMicrosoftSpeech(opts: {
  text: string;
  accent?: unknown;
  gender?: unknown;
  rate?: unknown;
}): Promise<{ buffer: Buffer; voiceName: string; label: string }> {
  const cleanText = String(opts.text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);

  if (!cleanText) {
    throw new Error("Text is required for speech synthesis.");
  }

  const accent = normalizeAccent(opts.accent);
  const gender = normalizeGender(opts.gender);
  const rate = normalizeRate(opts.rate);
  const voice = resolveMicrosoftVoice(accent, gender);

  // Optional Azure Speech upgrade if credentials are configured in env
  const azureBuf = await synthesizeViaAzure(
    cleanText,
    voice.shortName,
    accent,
    rate
  ).catch(() => null);

  if (azureBuf && azureBuf.byteLength > 0) {
    return { buffer: azureBuf, voiceName: voice.shortName, label: voice.label };
  }

  const tts = new MsEdgeTTS({
    connectionTimeoutMs: 10000,
    synthesisTimeoutMs: 25000,
  });

  try {
    await tts.setMetadata(
      voice.shortName,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(cleanText, {
      rate: rateToProsodyPercent(rate),
    });

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      audioStream.on("data", (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      audioStream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      audioStream.on("error", (err: Error) => reject(err));
    });

    if (!buffer || buffer.byteLength === 0) {
      throw new Error("Empty audio returned from Microsoft Neural TTS.");
    }

    return { buffer, voiceName: voice.shortName, label: voice.label };
  } finally {
    try {
      tts.close();
    } catch {}
  }
}
