import { getZoomClassMode, type ZoomClassMode } from "@/lib/zoom/class-mode";
import { requireZoomConfig } from "@/lib/zoom/config";
import { randomUUID } from "node:crypto";

export type ZoomClassMetadata = {
  webinarId: string;
  mode: ZoomClassMode;
  password: string;
  hostEmail: string;
  joinUrl: string;
  createdAt: string;
};

const classKey = (classId: string) => `zoom_class:${classId}`;

export async function getZoomAccessToken() {
  const config = requireZoomConfig();
  const basic = Buffer.from(`${config.apiClientId}:${config.apiClientSecret}`).toString("base64");
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(config.accountId)}`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) throw Object.assign(new Error(data?.reason || data?.error || data?.message || `Zoom OAuth failed with HTTP ${response.status}.`), { status: 502 });
  return String(data.access_token);
}

async function zoomApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getZoomAccessToken();
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.message || data?.reason || `Zoom API failed with HTTP ${response.status}.`), { status: response.status >= 500 ? 502 : response.status });
  return data as T;
}

export async function getZoomHostStatus() {
  const config = requireZoomConfig();
  const user = await zoomApi<{ email?: string; type?: number; feature?: { webinar?: boolean; webinar_capacity?: number; meeting_capacity?: number } }>(`/users/${encodeURIComponent(config.hostEmail)}`);
  return {
    email: user.email || config.hostEmail,
    licensed: user.type === 2 || user.type === 3,
    webinarEnabled: Boolean(user.feature?.webinar),
    webinarCapacity: Number(user.feature?.webinar_capacity || 0),
    meetingCapacity: Number(user.feature?.meeting_capacity || 0),
  };
}

export async function getZoomZak(userId: string) {
  const data = await zoomApi<{ token?: string }>(`/users/${encodeURIComponent(userId)}/token?type=zak`);
  if (!data.token) throw Object.assign(new Error("Zoom did not return a host ZAK token."), { status: 502 });
  return String(data.token);
}

export async function loadZoomClassMetadata(service: any, classId: string): Promise<ZoomClassMetadata | null> {
  const { data, error } = await service.from("live_class_settings").select("value").eq("key", classKey(classId)).maybeSingle();
  if (error) throw error;
  if (!data?.value) return null;
  try {
    const stored = JSON.parse(String(data.value));
    if (!stored?.webinarId) return null;
    return { ...stored, mode: stored.mode === "meeting" ? "meeting" : "webinar" } as ZoomClassMetadata;
  } catch { return null; }
}

async function saveZoomClassMetadata(service: any, classId: string, metadata: ZoomClassMetadata) {
  const { error } = await service.from("live_class_settings").upsert({
    key: classKey(classId), value: JSON.stringify(metadata), updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw error;
}

async function claimZoomProvisioning(service: any, classId: string) {
  const value = JSON.stringify({ state: "provisioning", owner: randomUUID(), startedAt: Date.now() });
  const key = classKey(classId);
  for (let attempt = 0; attempt < 20; attempt++) {
    const { error } = await service.from("live_class_settings").insert({ key, value });
    if (!error) return { value, existing: null as ZoomClassMetadata | null };
    if (error.code !== "23505") throw error;
    const existing = await loadZoomClassMetadata(service, classId);
    if (existing) return { value: "", existing };
    const { data, error: readError } = await service.from("live_class_settings").select("value").eq("key", key).maybeSingle();
    if (readError) throw readError;
    try {
      const state = JSON.parse(String(data?.value || ""));
      if (state.state === "provisioning" && Date.now() - Number(state.startedAt) > 120000) {
        // Compare the stored value before clearing a stale claim.
        await service.from("live_class_settings").delete().eq("key", key).eq("value", data.value);
      }
    } catch { /* A concurrent request may have just completed the claim. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw Object.assign(new Error("Zoom is still preparing this class. Please retry in a moment."), { status: 503 });
}

export async function ensureZoomWebinar(service: any, liveClass: any): Promise<ZoomClassMetadata> {
  const classId = String(liveClass.id || "");
  const existing = await loadZoomClassMetadata(service, classId);
  if (existing) {
    if (String(liveClass.provider_room_id || "") !== existing.webinarId) {
      const { error } = await service.from("live_classes").update({ provider: "zoom", provider_room_id: existing.webinarId, join_url: existing.joinUrl || null }).eq("id", classId);
      if (error) throw error;
    }
    return existing;
  }
  const claim = await claimZoomProvisioning(service, classId);
  if (claim.existing) {
    const metadata = claim.existing;
    if (String(liveClass.provider_room_id || "") !== metadata.webinarId) {
      const { error } = await service.from("live_classes").update({ provider: "zoom", provider_room_id: metadata.webinarId, join_url: metadata.joinUrl || null }).eq("id", classId);
      if (error) throw error;
    }
    return metadata;
  }
  try {
  const config = requireZoomConfig();
  const mode = await getZoomClassMode(service, classId);
  const startsAt = new Date(liveClass.starts_at || Date.now()).getTime();
  const endsAt = liveClass.ends_at ? new Date(liveClass.ends_at).getTime() : startsAt + 60 * 60000;
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) throw Object.assign(new Error("This class has an invalid start or end time."), { status: 400 });
  const duration = Math.max(10, Math.min(1440, Math.ceil((endsAt - startsAt) / 60000)));
  const created = await zoomApi<{ id?: string | number; password?: string; join_url?: string }>(
    `/users/${encodeURIComponent(config.hostEmail)}/${mode === "meeting" ? "meetings" : "webinars"}`,
    { method: "POST", body: JSON.stringify({
      topic: String(liveClass.title || liveClass.topic || "Ibemhal IAS Live Now"),
      type: mode === "meeting" ? 2 : 5,
      start_time: new Date(startsAt).toISOString(),
      duration,
      timezone: String(liveClass.timezone || "Asia/Kolkata"),
      agenda: String(liveClass.topic || ""),
      settings: { approval_type: 2 },
    }) },
  );
  const webinarId = String(created.id || "");
  if (!webinarId) throw Object.assign(new Error(`Zoom did not return a ${mode} ID.`), { status: 502 });
  const metadata: ZoomClassMetadata = {
    webinarId, mode, password: String(created.password || ""), hostEmail: config.hostEmail,
    joinUrl: String(created.join_url || ""), createdAt: new Date().toISOString(),
  };
  await saveZoomClassMetadata(service, classId, metadata);
  const { error } = await service.from("live_classes").update({ provider: "zoom", provider_room_id: webinarId, join_url: metadata.joinUrl || null, updated_at: new Date().toISOString() }).eq("id", classId);
  if (error) throw error;
  return metadata;
  } catch (error) {
    await service.from("live_class_settings").delete().eq("key", classKey(classId)).eq("value", claim.value);
    throw error;
  }
}
