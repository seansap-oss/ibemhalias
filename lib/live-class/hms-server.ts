import { createHmac, randomUUID } from "node:crypto";

const HMS_API = "https://api.100ms.live/v2";

function b64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

function credentials() {
  const accessKey = process.env.HMS_APP_ACCESS_KEY?.trim();
  const appSecret = process.env.HMS_APP_SECRET?.trim();
  if (!accessKey || !appSecret) {
    throw Object.assign(
      new Error("100ms is not configured. Add HMS_APP_ACCESS_KEY and HMS_APP_SECRET."),
      { status: 503 }
    );
  }
  return { accessKey, appSecret };
}

export function hmsConfigStatus() {
  return {
    accessKey: Boolean(process.env.HMS_APP_ACCESS_KEY),
    appSecret: Boolean(process.env.HMS_APP_SECRET),
    templateId: Boolean(process.env.HMS_TEMPLATE_ID),
    teacherRole: "teacher",
    studentRole: "student",
    speakerRole: "speaker",
  };
}

export function createHmsAppToken(input: {
  roomId: string;
  userId: string;
  role: string;
  expiresSeconds?: number;
}) {
  const { accessKey, appSecret } = credentials();
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      access_key: accessKey,
      room_id: input.roomId,
      user_id: input.userId,
      role: input.role,
      type: "app",
      version: 2,
      jti: randomUUID(),
      iat: now,
      nbf: now - 5,
      exp: now + (input.expiresSeconds || 6 * 60 * 60),
    },
    appSecret
  );
}

export function createHmsManagementToken(expiresSeconds = 60 * 60) {
  const { accessKey, appSecret } = credentials();
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      access_key: accessKey,
      type: "management",
      version: 2,
      jti: randomUUID(),
      iat: now,
      nbf: now - 5,
      exp: now + expiresSeconds,
    },
    appSecret
  );
}

export async function hmsRequest<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = createHmsManagementToken();
  const response = await fetch(`${HMS_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    throw Object.assign(
      new Error(data?.message || data?.error || `100ms HTTP ${response.status}`),
      { status: response.status, providerData: data }
    );
  }
  return data as T;
}

export async function createIbemhalTemplate() {
  const teacherRole = "teacher";
  const studentRole = "student";
  const speakerRole = "speaker";

  return hmsRequest<any>("/templates", {
    method: "POST",
    body: JSON.stringify({
      name: "ibemhal-ias-classroom-v1",
      roles: {
        [teacherRole]: {
          name: teacherRole,
          publishParams: {
            allowed: ["audio", "video", "screen"],
            audio: { bitRate: 48, codec: "opus" },
            video: { bitRate: 900, codec: "vp8", frameRate: 25, width: 1280, height: 720 },
            screen: { bitRate: 1200, codec: "vp8", frameRate: 15, width: 1920, height: 1080 },
          },
          subscribeParams: {
            subscribeToRoles: [teacherRole, speakerRole],
            maxSubsBitRate: 3600,
          },
          permissions: {
            endRoom: true,
            removeOthers: true,
            mute: true,
            unmute: true,
            changeRole: true,
            browserRecording: true,
            hlsStreaming: true,
            pollRead: true,
            pollWrite: true,
          },
          priority: 1,
        },
        [speakerRole]: {
          name: speakerRole,
          publishParams: {
            allowed: ["audio", "video"],
            audio: { bitRate: 48, codec: "opus" },
            video: { bitRate: 700, codec: "vp8", frameRate: 25, width: 960, height: 540 },
          },
          subscribeParams: {
            subscribeToRoles: [teacherRole, speakerRole],
            maxSubsBitRate: 3200,
          },
          permissions: { pollRead: true },
          priority: 2,
        },
        [studentRole]: {
          name: studentRole,
          publishParams: { allowed: [] },
          subscribeParams: {
            subscribeToRoles: [teacherRole, speakerRole],
            maxSubsBitRate: 2600,
          },
          permissions: { pollRead: true },
          priority: 3,
        },
      },
      settings: { region: "in" },
    }),
  });
}

export async function createHmsRoom(input: {
  name: string;
  description: string;
  templateId?: string | null;
  capacity?: number;
}) {
  return hmsRequest<any>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.replace(/[^a-zA-Z0-9._:-]/g, "-").slice(0, 80),
      description: input.description.slice(0, 200),
      ...(input.templateId ? { template_id: input.templateId } : {}),
      region: "in",
      size: Math.max(10, Math.min(2500, Number(input.capacity || 500))),
      max_duration_seconds: 43200,
    }),
  });
}

export async function startHmsRecording(roomId: string) {
  return hmsRequest(`/recordings/room/${encodeURIComponent(roomId)}/start`, {
    method: "POST",
    body: JSON.stringify({ resolution: { width: 1280, height: 720 } }),
  });
}

export async function stopHmsRecording(roomId: string) {
  return hmsRequest(`/recordings/room/${encodeURIComponent(roomId)}/stop`, {
    method: "POST",
  });
}
