import { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import {
  getAdminCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export type ChatActor = {
  userId: string;
  fullName: string;
  username: string;
  role: "student" | "instructor" | "admin";
  isAdmin: boolean;
};

export function chatService() {
  return createCmsServiceClient();
}

export async function chatActor(request: NextRequest): Promise<ChatActor | null> {
  const wantsAdmin =
    request.headers.get("x-ibemhal-admin") === "1";

  if (wantsAdmin) {
    const token = request.cookies.get(
      getAdminCookieName()
    )?.value;
    const admin = await verifyAdminSessionToken(token);
    if (admin) {
      return {
        userId: `admin:${admin.email}`,
        fullName: "Ibemhal IAS Admin",
        username: "ibemhal_admin",
        role: "admin",
        isAdmin: true,
      };
    }
  }

  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (user) {
      const service = chatService();
      const { data: profile } = await service
        .from("profiles")
        .select("id,full_name,email,student_code,role,chat_username")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        const fallback = String(
          profile.student_code ||
          profile.email?.split("@")[0] ||
          "student"
        )
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, "_");

        return {
          userId: user.id,
          fullName:
            profile.full_name ||
            profile.email ||
            "Student",
          username:
            profile.chat_username || fallback,
          role:
            profile.role === "instructor"
              ? "instructor"
              : profile.role === "admin"
                ? "admin"
                : "student",
          isAdmin: profile.role === "admin",
        };
      }
    }
  } catch {}

  return null;
}

export async function canAccessChatRoom(client: any, actor: ChatActor, room: any) {
  if (actor.isAdmin) return true;
  if (room.room_type === "community") return true;
  if (room.room_type === "live_class" && room.live_class_id) {
    const { data } = await client
      .from("live_class_assignments")
      .select("id")
      .eq("live_class_id", room.live_class_id)
      .eq("student_id", actor.userId)
      .eq("status", "active")
      .maybeSingle();
    return Boolean(data);
  }
  return false;
}

export async function ensureLiveClassChatRoom(client: any, classId: string) {
  const { data: existing } = await client
    .from("chat_rooms")
    .select("*")
    .eq("live_class_id", classId)
    .maybeSingle();
  if (existing) return existing;

  const { data: liveClass, error: classError } = await client
    .from("live_classes")
    .select("id,title,topic")
    .eq("id", classId)
    .single();
  if (classError) throw classError;

  const { data, error } = await client
    .from("chat_rooms")
    .insert({
      slug: `class-${classId}`,
      name: `${liveClass.title} · Live Class Chat`,
      description: liveClass.topic || "Live class questions and discussion",
      room_type: "live_class",
      live_class_id: classId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function signedChatAttachment(client: any, path?: string | null) {
  if (!path) return null;
  const { data } = await client.storage
    .from("chat-media")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl || null;
}
