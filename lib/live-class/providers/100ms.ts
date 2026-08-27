import {
  createHmsAppToken,
  hmsConfigStatus,
} from "@/lib/live-class/hms-server";
import type {
  LiveProviderConfigStatus,
  LiveProviderJoinResult,
  LiveRole,
} from "@/lib/live-class/providers/types";

export function hmsProviderConfigStatus(): LiveProviderConfigStatus {
  const status = hmsConfigStatus() as any;
  return {
    provider: "100ms",
    configured: Boolean(status?.configured),
    missing: Array.isArray(status?.missing) ? status.missing : [],
  };
}

export async function create100msJoinToken(input: {
  roomName: string;
  userId: string;
  displayName: string;
  role: LiveRole;
}): Promise<LiveProviderJoinResult> {
  const role = input.role === "cohost" ? "teacher" : input.role;
  return {
    provider: "100ms",
    token: createHmsAppToken({
      roomId: input.roomName,
      userId: input.userId,
      role,
    }),
    roomName: input.roomName,
    role: input.role,
    userName: input.displayName,
    userId: input.userId,
  };
}
