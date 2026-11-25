import { getZoomConfig } from "@/lib/zoom/config";

export type ZoomClassMode = "meeting" | "webinar";

const modeKey = (classId: string) => `zoom_mode:${classId}`;

export function parseZoomClassMode(value: unknown): ZoomClassMode | null {
  return value === "meeting" || value === "webinar" ? value : null;
}

export async function getZoomClassMode(service: any, classId: string): Promise<ZoomClassMode> {
  const { data, error } = await service.from("live_class_settings").select("value").eq("key", modeKey(classId)).maybeSingle();
  if (error) throw error;
  return parseZoomClassMode(data?.value) || parseZoomClassMode(getZoomConfig().sessionMode) || "webinar";
}

export async function saveZoomClassMode(service: any, classId: string, mode: ZoomClassMode) {
  const { error } = await service.from("live_class_settings").upsert({
    key: modeKey(classId), value: mode, updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw error;
}
