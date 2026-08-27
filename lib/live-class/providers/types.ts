export type LiveProviderName = "100ms" | "livekit";
export type LiveRole = "teacher" | "cohost" | "speaker" | "student";

export interface LiveProviderJoinResult {
  provider: LiveProviderName;
  token: string;
  roomName: string;
  url?: string;
  role: LiveRole;
  userName: string;
  userId: string;
}

export interface LiveProviderConfigStatus {
  provider: LiveProviderName;
  configured: boolean;
  missing: string[];
}
