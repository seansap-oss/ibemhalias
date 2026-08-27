import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import type {
  LiveProviderConfigStatus,
  LiveProviderJoinResult,
  LiveRole,
} from "@/lib/live-class/providers/types";

function parseLiveKitUrl(raw: string) {
  const value = String(raw || "").trim();
  if (!value) {
    throw Object.assign(new Error("LIVEKIT_URL is missing."), { status: 503 });
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw Object.assign(
      new Error(
        "LIVEKIT_URL is invalid. Use a WebSocket address such as ws://192.168.1.20:7880 for local testing or wss://live.example.com for production."
      ),
      { status: 503 }
    );
  }

  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw Object.assign(
      new Error("LIVEKIT_URL must begin with ws:// or wss://."),
      { status: 503 }
    );
  }

  return value.replace(/\/$/, "");
}

export function liveKitConfigStatus(): LiveProviderConfigStatus {
  const required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] as const;
  const missing: string[] = required.filter((key) => !String(process.env[key] || "").trim());

  if (!missing.length) {
    try {
      parseLiveKitUrl(String(process.env.LIVEKIT_URL || ""));
    } catch {
      missing.push("LIVEKIT_URL (invalid)");
    }
  }

  return {
    provider: "livekit",
    configured: missing.length === 0,
    missing: [...missing],
  };
}

export function requireLiveKitConfig() {
  const apiKey = String(process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = String(process.env.LIVEKIT_API_SECRET || "").trim();

  if (!apiKey || !apiSecret) {
    const missing = [
      !apiKey ? "LIVEKIT_API_KEY" : "",
      !apiSecret ? "LIVEKIT_API_SECRET" : "",
    ].filter(Boolean);
    throw Object.assign(
      new Error(`Live Now is not configured. Missing: ${missing.join(", ")}`),
      { status: 503 }
    );
  }

  return {
    url: parseLiveKitUrl(String(process.env.LIVEKIT_URL || "")),
    apiKey,
    apiSecret,
  };
}

export function toLiveKitHttpUrl(url: string) {
  const valid = parseLiveKitUrl(url);
  return valid.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:").replace(/\/$/, "");
}

export async function createLiveKitJoinToken(input: {
  roomName: string;
  userId: string;
  displayName: string;
  role: LiveRole;
}): Promise<LiveProviderJoinResult> {
  const { url, apiKey, apiSecret } = requireLiveKitConfig();
  const host = input.role === "teacher" || input.role === "cohost";
  const speaker = input.role === "speaker";

  const token = new AccessToken(apiKey, apiSecret, {
    identity: input.userId,
    name: input.displayName,
    ttl: "30m",
    attributes: { role: input.role },
  });

  token.addGrant({
    roomJoin: true,
    room: input.roomName,
    canPublish: host || speaker,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: false,
    roomAdmin: host,
  });

  return {
    provider: "livekit",
    token: await token.toJwt(),
    roomName: input.roomName,
    url,
    role: input.role,
    userName: input.displayName,
    userId: input.userId,
  };
}

export async function getLiveKitParticipantCount(roomName: string) {
  const { url, apiKey, apiSecret } = requireLiveKitConfig();
  const client = new RoomServiceClient(toLiveKitHttpUrl(url), apiKey, apiSecret);
  try {
    const participants = await client.listParticipants(roomName);
    return participants.length;
  } catch {
    return 0;
  }
}
