import type { LiveProviderName } from "@/lib/live-class/providers/types";
import { create100msJoinToken, hmsProviderConfigStatus } from "@/lib/live-class/providers/100ms";
import { createLiveKitJoinToken, liveKitConfigStatus } from "@/lib/live-class/providers/livekit";

export function normalizeLiveProvider(value: unknown): LiveProviderName {
  return String(value || "100ms").toLowerCase() === "livekit" ? "livekit" : "100ms";
}

export function providerConfigStatus(provider: LiveProviderName) {
  return provider === "livekit" ? liveKitConfigStatus() : hmsProviderConfigStatus();
}

export function allProviderConfigStatus() {
  return {
    "100ms": hmsProviderConfigStatus(),
    livekit: liveKitConfigStatus(),
  };
}

export async function createProviderJoinToken(input: {
  provider: LiveProviderName;
  roomName: string;
  userId: string;
  displayName: string;
  role: "teacher" | "cohost" | "speaker" | "student";
}) {
  return input.provider === "livekit"
    ? createLiveKitJoinToken(input)
    : create100msJoinToken(input);
}
