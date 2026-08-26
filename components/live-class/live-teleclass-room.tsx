"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Copy,
  Download,
  FileText,
  Hand,
  Lightbulb,
  Loader2,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  Radio,
  RotateCcw,
  Settings,
  Square,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  HMSRoomProvider,
  selectIsConnectedToRoom,
  selectIsLocalAudioEnabled,
  selectIsLocalScreenShared,
  selectIsLocalVideoEnabled,
  selectHLSState,
  selectRecordingState,
  selectLocalPeer,
  selectPeers,
  selectHMSMessages,
  useHMSActions,
  useHMSStore,
  useVideo,
} from "@100mslive/react-sdk";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";
import { SITE_VERSION_LABEL } from "@/lib/site-version";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;


function HlsPlayer({
  url,
}: {
  url: string;
}) {
  const videoRef =
    React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let cancelled = false;
    let destroyHls: (() => void) | null = null;

    const start = async () => {
      const nativeHls = video.canPlayType(
        "application/vnd.apple.mpegurl"
      );

      if (
        nativeHls &&
        "ManagedMediaSource" in window
      ) {
        video.src = url;
        return;
      }

      try {
        const imported = await import("hls.js");
        if (cancelled) return;
        const Hls = imported.default;

        if (Hls.isSupported()) {
          const hls = new Hls({
            lowLatencyMode: true,
            backBufferLength: 30,
          });
          destroyHls = () => hls.destroy();
          hls.loadSource(url);
          hls.attachMedia(video);
          return;
        }
      } catch {
        // Native HLS fallback below.
      }

      if (nativeHls) {
        video.src = url;
      }
    };

    void start();

    return () => {
      cancelled = true;
      destroyHls?.();
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      autoPlay
      controls
      playsInline
      className="h-full w-full bg-black object-contain"
    />
  );
}

function PeerVideo({
  peer,
  featured = false,
}: {
  peer: AnyRow;
  featured?: boolean;
}) {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack,
  });

  return (
    <div
      className={`relative overflow-hidden bg-[#08122b] ${
        featured
          ? "h-full w-full"
          : "aspect-video rounded-xl"
      }`}
    >
      {peer.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          muted={peer.isLocal}
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full min-h-36 place-items-center text-white">
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10 text-lg font-black">
              {String(peer.name || "?")
                .split(/\s+/)
                .map((part: string) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="mt-2 text-xs font-bold">
              {peer.name}
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-black text-white">
        {peer.name}
        {peer.isLocal ? " (You)" : ""}
      </div>

      {peer.isHandRaised ? (
        <div className="absolute right-2 top-2 rounded-full bg-amber-400 p-2 text-slate-950">
          <Hand className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}


type LiveChatPayload = {
  clientId: string;
  body: string;
  username: string;
  authorName: string;
  role: string;
};

function liveChatColor(key: string) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `hsl(${Math.abs(hash) % 360} 68% 40%)`;
}

function LiveRoomChat({
  mode,
  profile,
}: {
  mode: "student" | "teacher";
  profile?: AnyRow | null;
}) {
  const actions = useHMSActions();
  const localPeer = useHMSStore(selectLocalPeer);
  const allMessages = useHMSStore(selectHMSMessages);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [optimistic, setOptimistic] = React.useState<
    Array<{
      id: string;
      payload: LiveChatPayload;
      time: Date;
      senderKey: string;
    }>
  >([]);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const username =
    mode === "teacher"
      ? "ibemhal_teacher"
      : String(
          profile?.chat_username ||
            profile?.student_code ||
            profile?.email?.split("@")[0] ||
            "student"
        )
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, "_");

  const parsed = React.useMemo(() => {
    const rows = (allMessages || [])
      .filter(
        (message: any) =>
          message.type === "ibemhal_live_chat"
      )
      .map((message: any) => {
        try {
          const payload = JSON.parse(
            String(message.message || "")
          ) as LiveChatPayload;
          return {
            id:
              String(
                message.id ||
                  message.messageId ||
                  payload.clientId
              ),
            payload,
            time: new Date(
              message.time || Date.now()
            ),
            senderKey:
              String(
                message.sender?.id ||
                  message.sender ||
                  payload.username
              ),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{
      id: string;
      payload: LiveChatPayload;
      time: Date;
      senderKey: string;
    }>;

    const receivedIds = new Set(
      rows.map((row) => row.payload.clientId)
    );
    return [
      ...rows,
      ...optimistic.filter(
        (row) =>
          !receivedIds.has(row.payload.clientId)
      ),
    ].sort(
      (a, b) =>
        a.time.getTime() - b.time.getTime()
    );
  }, [allMessages, optimistic]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [parsed.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;

    const clientId = crypto.randomUUID();
    const payload: LiveChatPayload = {
      clientId,
      body: body.slice(0, 1500),
      username,
      authorName:
        localPeer?.name ||
        profile?.full_name ||
        (mode === "teacher"
          ? "Ibemhal IAS Teacher"
          : "Student"),
      role:
        mode === "teacher"
          ? "teacher"
          : String(localPeer?.roleName || "student"),
    };

    setOptimistic((current) => [
      ...current,
      {
        id: `local-${clientId}`,
        payload,
        time: new Date(),
        senderKey:
          localPeer?.id ||
          username,
      },
    ]);
    setText("");
    setSending(true);
    setError("");

    try {
      await actions.sendBroadcastMessage(
        JSON.stringify(payload),
        "ibemhal_live_chat"
      );
    } catch (err: any) {
      setOptimistic((current) =>
        current.filter(
          (row) =>
            row.payload.clientId !== clientId
        )
      );
      setText(body);
      setError(
        err?.message ||
          "Live-class message could not be sent."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[500px] min-h-0 flex-col lg:h-[620px]">
      <div className="border-b bg-blue-50/60 px-3 py-2 text-[10px] font-semibold leading-relaxed text-[#174699]">
        Live-class chat uses the 100ms room and is
        intentionally temporary. Permanent student
        discussions stay in Group Chat.
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {parsed.map((row) => {
          const color = liveChatColor(
            row.senderKey
          );
          const own =
            row.payload.username === username;
          return (
            <div
              key={row.id}
              className={`flex ${
                own
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl border px-3 py-2 shadow-sm ${
                  own
                    ? "bg-blue-50"
                    : "bg-white"
                }`}
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: color,
                }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="text-[10px] font-black"
                    style={{ color }}
                  >
                    {row.payload.authorName}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    @{row.payload.username}
                  </span>
                  {row.payload.role !==
                  "student" ? (
                    <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[8px] font-black text-violet-700">
                      {row.payload.role}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
                  {row.payload.body}
                </div>
                <div className="mt-1 text-right text-[8px] font-semibold text-slate-400">
                  {row.time.toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {!parsed.length ? (
          <div className="grid h-full min-h-48 place-items-center text-center">
            <div className="max-w-xs text-xs font-semibold text-slate-400">
              No live-class messages yet. Ask a
              question without leaving the telecast.
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-white p-3">
        {error ? (
          <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
            {error}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={1500}
            placeholder="Ask a question in this live class…"
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border bg-slate-50 px-3 py-3 text-xs outline-none focus:border-blue-300"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !text.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#14256f] text-white disabled:opacity-50"
            aria-label="Send live-class message"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomInside({
  classId,
  mode,
}: {
  classId: string;
  mode: "student" | "teacher";
}) {
  const actions = useHMSActions();
  const connected = useHMSStore(
    selectIsConnectedToRoom
  );
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const audioEnabled = useHMSStore(
    selectIsLocalAudioEnabled
  );
  const videoEnabled = useHMSStore(
    selectIsLocalVideoEnabled
  );
  const screenSharing = useHMSStore(
    selectIsLocalScreenShared
  );
  const hlsState = useHMSStore(selectHLSState);
  const recordingState = useHMSStore(
    selectRecordingState
  );

  const [data, setData] =
    React.useState<AnyRow | null>(null);
  const [loading, setLoading] =
    React.useState(true);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState<
    "chat" | "pdf" | "files" | "people"
  >("chat");
  const [minimized, setMinimized] =
    React.useState(false);
  const [settings, setSettings] =
    React.useState(false);
  const [devices, setDevices] = React.useState<
    MediaDeviceInfo[]
  >([]);
  const [lighting, setLighting] =
    React.useState("auto");
  const [uploading, setUploading] =
    React.useState(false);
  const [resourceType, setResourceType] =
    React.useState("pdf");
  const [outputVolume, setOutputVolume] =
    React.useState(1);

  const stageRef =
    React.useRef<HTMLDivElement>(null);
  const uploadRef =
    React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint =
        mode === "student"
          ? `/api/live-class/student?classId=${encodeURIComponent(
              classId
            )}`
          : `/api/live-class/provider?classId=${encodeURIComponent(
              classId
            )}`;

      const response = await fetch(endpoint, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        if (
          mode === "student" &&
          response.status === 401
        ) {
          const returnTo = `/live-classes/${classId}`;
          window.location.replace(
            `/login?redirectedFrom=${encodeURIComponent(
              returnTo
            )}`
          );
          return;
        }

        throw new Error(
          payload.error || "Unable to load class."
        );
      }

      setData({
        liveClass: payload.liveClass,
        profile: payload.profile || null,
        config: payload.config || null,
      });

      if (mode === "student") {
        fetch("/api/live-class/student", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            event: "join",
          }),
        }).catch(() => {});
      }

      const tokenResponse = await fetch(
        `/api/live-class/token?classId=${encodeURIComponent(
          classId
        )}${
          mode === "teacher"
            ? "&mode=teacher"
            : ""
        }`,
        { cache: "no-store" }
      );
      const tokenPayload =
        await tokenResponse.json();

      if (
        tokenResponse.ok &&
        tokenPayload.authToken
      ) {
        if (!connected) {
          await (actions as any).join({
            userName: tokenPayload.userName,
            authToken: tokenPayload.authToken,
          });
        }
      } else {
        if (
          mode === "student" &&
          tokenResponse.status === 401
        ) {
          const returnTo = `/live-classes/${classId}`;
          window.location.replace(
            `/login?redirectedFrom=${encodeURIComponent(
              returnTo
            )}`
          );
          return;
        }

        setError(
          tokenPayload.error ||
            "100ms provider is not ready."
        );
      }
    } catch (err: any) {
      setError(
        err?.message || "Unable to join class."
      );
    } finally {
      setLoading(false);
    }
  }, [classId, mode, actions, connected]);

  React.useEffect(() => {
    void load();

    return () => {
      if (mode === "student") {
        fetch("/api/live-class/student", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            event: "leave",
          }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [load, classId, mode]);

  React.useEffect(() => {
    if (!settings) return;
    navigator.mediaDevices
      ?.enumerateDevices?.()
      .then(setDevices)
      .catch(() => {});
  }, [settings, connected]);

  React.useEffect(() => {
    const applyVolume = () => {
      document
        .querySelectorAll<HTMLMediaElement>("audio,video")
        .forEach((element) => {
          if (!element.muted) {
            element.volume = outputVolume;
          }
        });
    };

    applyVolume();
    const timer = window.setTimeout(applyVolume, 250);
    return () => window.clearTimeout(timer);
  }, [outputVolume, peers.length, hlsState?.running]);

  const liveClass = data?.liveClass;
  const teacherRole = "teacher";
  const speakerRole = "speaker";
  const studentRole = "student";

  const teachers = peers.filter(
    (peer: AnyRow) =>
      String(peer.roleName || "").toLowerCase() ===
      teacherRole.toLowerCase()
  );
  const speakers = peers.filter(
    (peer: AnyRow) =>
      String(peer.roleName || "").toLowerCase() ===
      speakerRole.toLowerCase()
  );
  const featured =
    teachers[0] ||
    speakers[0] ||
    peers.find((peer: AnyRow) => !peer.isLocal) ||
    localPeer;

  const hlsUrl =
    hlsState?.variants?.[0]?.url || "";
  const hlsRunning =
    Boolean(hlsState?.running && hlsUrl);

  const recordingRunning = Boolean(
    recordingState?.browser?.running ||
      recordingState?.server?.running
  );

  const localCanPublish =
    mode === "teacher" ||
    String(localPeer?.roleName || "").toLowerCase() ===
      speakerRole.toLowerCase();

  const goFullscreen = async () => {
    try {
      await stageRef.current?.requestFullscreen?.();
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };
      await orientation?.lock?.("landscape");
    } catch {
      // Mobile browsers may reject orientation lock.
    }
  };

  const switchCamera = async () => {
    try {
      await (actions as any).switchCamera();
    } catch (err: any) {
      setError(
        err?.message || "Camera switching failed."
      );
    }
  };

  const changeDevice = async (
    kind: MediaDeviceKind,
    deviceId: string
  ) => {
    if (!deviceId) return;
    try {
      if (kind === "audioinput") {
        await (actions as any).setAudioSettings({
          deviceId,
        });
      } else if (kind === "videoinput") {
        await (actions as any).setVideoSettings({
          deviceId,
        });
      } else if (kind === "audiooutput") {
        await (actions as any).setAudioOutputDevice(
          deviceId
        );
      }
    } catch (err: any) {
      setError(
        err?.message || "Device change failed."
      );
    }
  };

  const raiseHand = async () => {
    try {
      if (localPeer?.isHandRaised) {
        await (actions as any).lowerLocalPeerHand();
      } else {
        await (actions as any).raiseLocalPeerHand();
      }
    } catch (err: any) {
      setError(
        err?.message || "Raise-hand action failed."
      );
    }
  };

  const shareScreen = async () => {
    try {
      await (actions as any).setScreenShareEnabled(
        !screenSharing
      );
    } catch (err: any) {
      setError(
        err?.message || "Screen sharing failed."
      );
    }
  };

  const promote = async (peer: AnyRow) => {
    try {
      await (actions as any).changeRoleOfPeer(
        peer.id,
        speakerRole,
        true
      );
    } catch (err: any) {
      setError(
        err?.message || "Role change failed."
      );
    }
  };

  const demote = async (peer: AnyRow) => {
    try {
      await (actions as any).changeRoleOfPeer(
        peer.id,
        studentRole,
        true
      );
    } catch (err: any) {
      setError(
        err?.message || "Role change failed."
      );
    }
  };

  const muteAudience = async () => {
    try {
      const audience = peers.filter(
        (peer: AnyRow) =>
          !peer.isLocal &&
          peer.audioTrack &&
          String(
            peer.roleName || ""
          ).toLowerCase() !==
            teacherRole.toLowerCase()
      );

      for (const peer of audience) {
        await (actions as any).setRemoteTrackEnabled(
          peer.audioTrack,
          false
        );
      }
    } catch (err: any) {
      setError(
        err?.message || "Mute audience failed."
      );
    }
  };

  const toggleHlsBroadcast = async () => {
    try {
      if (hlsState?.running) {
        await (actions as any).stopHLSStreaming();
      } else {
        await (actions as any).startHLSStreaming();
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "HLS broadcast could not start. Configure HLS in the 100ms dashboard template first."
      );
    }
  };

  const providerAction = async (
    action: string,
    extra: AnyRow = {}
  ) => {
    const response = await fetch(
      "/api/live-class/provider",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          classId,
          ...extra,
        }),
      }
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(
        payload.error || "Provider action failed."
      );
    }
    return payload;
  };

  const toggleRecording = async () => {
    try {
      await providerAction(
        recordingRunning
          ? "record_stop"
          : "record_start"
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Recording action failed. Configure composite recording on the 100ms dashboard template."
      );
    }
  };

  const setLight = async (scene: string) => {
    setLighting(scene);
    try {
      const response = await fetch(
        "/api/live-class/lighting",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            scene,
          }),
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error || "Lighting control failed."
        );
      }
      if (!payload.configured && payload.message) {
        setError(payload.message);
      }
    } catch (err: any) {
      setError(
        err?.message || "Lighting control failed."
      );
    }
  };

  const provision = async () => {
    try {
      setLoading(true);
      await providerAction("provision");
      window.location.reload();
    } catch (err: any) {
      setError(
        err?.message ||
          "100ms room provisioning failed."
      );
      setLoading(false);
    }
  };

  const uploadResource = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const prepareResponse = await fetch(
        "/api/live-class/resource",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "prepare",
            classId,
            fileName: file.name,
            mime: file.type,
            size: file.size,
            resourceType,
          }),
        }
      );
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok) {
        throw new Error(
          prepared.error ||
            "Unable to prepare resource upload."
        );
      }

      const supabase = createClient();
      if (!supabase) {
        throw new Error(
          "Supabase client is unavailable."
        );
      }

      const upload = prepared.upload;
      const { error: storageError } =
        await supabase.storage
          .from(upload.bucket)
          .uploadToSignedUrl(
            upload.path,
            upload.token,
            file,
            { contentType: file.type }
          );
      if (storageError) throw storageError;

      const commitResponse = await fetch(
        "/api/live-class/resource",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "commit",
            classId,
            path: upload.path,
            title: file.name,
            mime: file.type,
            size: file.size,
            resourceType,
          }),
        }
      );
      const committed =
        await commitResponse.json();
      if (!commitResponse.ok) {
        throw new Error(
          committed.error ||
            "Unable to save resource record."
        );
      }

      await load();
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/live-classes/${classId}`
      );
    } catch {}
  };

  const leaveRoom = async () => {
    try {
      await (actions as any).leave();
    } finally {
      window.location.href =
        mode === "teacher"
          ? "/admin/live-classes/studio"
          : "/dashboard?view=live";
    }
  };

  const endClass = async () => {
    if (
      !window.confirm(
        "End this live class for everyone?"
      )
    ) {
      return;
    }
    try {
      await providerAction("set_status", {
        status: "completed",
      });
      try {
        await (actions as any).endRoom(
          true,
          "Class ended by teacher"
        );
      } catch {}
      window.location.href =
        "/admin/live-classes/studio";
    } catch (err: any) {
      setError(
        err?.message || "Unable to end class."
      );
    }
  };

  if (loading && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={
        mode === "teacher"
          ? "fixed inset-0 z-[100] overflow-y-auto bg-[#f7f9fd] text-slate-950"
          : "min-h-screen bg-[#f7f9fd] text-slate-950"
      }
    >
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-[1600px] items-center gap-3 px-3 sm:px-5">
          <Link
            href={
              mode === "teacher"
                ? "/admin/live-classes/studio"
                : "/dashboard?view=live"
            }
            className="grid h-10 w-10 place-items-center rounded-xl border"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <IbemhalLogo
            href="/"
            imageClassName="h-[48px] w-auto sm:h-[54px]"
          />

          <div className="ml-auto hidden text-[10px] font-bold text-slate-400 lg:block">
            {SITE_VERSION_LABEL}
          </div>

          <div
            className={`rounded-full px-3 py-1 text-[10px] font-black ${
              liveClass?.status === "live"
                ? "bg-green-50 text-green-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <span
              className={
                liveClass?.status === "live"
                  ? "text-green-500"
                  : ""
              }
            >
              ●
            </span>{" "}
            {String(
              liveClass?.status || "scheduled"
            ).toUpperCase()}
          </div>

          <div className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-[#174699]">
            {peers.length} online
          </div>
          {hlsState?.running ? (
            <div className="hidden rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-700 sm:block">
              HLS ON
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black text-[#14256f] sm:text-2xl">
              {liveClass?.title ||
                "Live Teleclass Room"}
            </h1>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              {liveClass?.topic}
              {liveClass?.faculty_name
                ? ` · ${liveClass.faculty_name}`
                : ""}
            </div>
          </div>

          {mode === "teacher" ? (
            <button
              type="button"
              onClick={() => void copyJoinLink()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 text-xs font-black text-[#174699]"
            >
              <Copy className="h-4 w-4" />
              Copy Student Join Link
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
            <Radio className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {mode === "teacher" &&
        !liveClass?.provider_room_id ? (
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="text-sm font-black text-[#14256f]">
              100ms classroom is ready to provision
            </div>
            <p className="mt-1 text-xs text-slate-600">
              This creates the Ibemhal
              teacher/student/speaker roles and a room
              in the India region using your 100ms
              credentials.
            </p>
            <button
              type="button"
              onClick={() => void provision()}
              className="mt-3 rounded-xl bg-[#14256f] px-4 py-2 text-xs font-black text-white"
            >
              Provision 100ms Room
            </button>
          </div>
        ) : null}

        <div
          className={`grid gap-4 ${
            minimized
              ? ""
              : "xl:grid-cols-[minmax(0,1fr)_390px]"
          }`}
        >
          <section
            className={
              minimized
                ? "fixed right-3 top-24 z-[90] w-[58vw] max-w-[360px] rounded-2xl bg-white p-2 shadow-2xl sm:w-[360px]"
                : ""
            }
          >
            <div
              ref={stageRef}
              className="relative overflow-hidden rounded-2xl bg-[#08122b] shadow-xl"
            >
              <div className="aspect-video">
                {mode === "student" && hlsRunning ? (
                  <HlsPlayer url={hlsUrl} />
                ) : featured ? (
                  <PeerVideo
                    peer={featured}
                    featured
                  />
                ) : (
                  <div className="grid h-full place-items-center text-center text-white">
                    <div>
                      <CameraOff className="mx-auto h-10 w-10 opacity-40" />
                      <div className="mt-3 text-sm font-black">
                        Waiting for the teacher
                        video…
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute left-3 top-3 flex gap-2">
                <span className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                  LIVE
                </span>
              </div>

              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMinimized(!minimized)
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg bg-black/55 text-white"
                  aria-label={
                    minimized
                      ? "Maximize video"
                      : "Minimize video"
                  }
                >
                  {minimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void goFullscreen()
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg bg-black/55 text-white"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className={`mt-2 flex items-center gap-1 overflow-x-auto rounded-2xl bg-[#10235f] p-2 text-white shadow-xl ${
                minimized ? "hidden" : ""
              }`}
            >
              {localCanPublish ? (
                <Ctl
                  label={
                    audioEnabled ? "Mute" : "Mic"
                  }
                  active={audioEnabled}
                  onClick={() =>
                    void actions.setLocalAudioEnabled(
                      !audioEnabled
                    )
                  }
                >
                  {audioEnabled ? (
                    <Mic />
                  ) : (
                    <MicOff />
                  )}
                </Ctl>
              ) : null}

              {localCanPublish ? (
                <Ctl
                  label={
                    videoEnabled
                      ? "Camera"
                      : "Camera Off"
                  }
                  active={videoEnabled}
                  onClick={() =>
                    void actions.setLocalVideoEnabled(
                      !videoEnabled
                    )
                  }
                >
                  {videoEnabled ? (
                    <Camera />
                  ) : (
                    <CameraOff />
                  )}
                </Ctl>
              ) : null}

              {localCanPublish ? (
                <Ctl
                  label="Switch Cam"
                  onClick={() =>
                    void switchCamera()
                  }
                >
                  <RotateCcw />
                </Ctl>
              ) : null}

              {mode === "teacher" ? (
                <Ctl
                  label={
                    screenSharing
                      ? "Stop Share"
                      : "Share"
                  }
                  active={screenSharing}
                  onClick={() =>
                    void shareScreen()
                  }
                >
                  <MonitorUp />
                </Ctl>
              ) : null}

              {mode === "teacher" ? (
                <Ctl
                  label={
                    hlsState?.running
                      ? "Stop HLS"
                      : "HLS Broadcast"
                  }
                  active={Boolean(hlsState?.running)}
                  onClick={() =>
                    void toggleHlsBroadcast()
                  }
                >
                  <Radio />
                </Ctl>
              ) : null}

              {mode === "teacher" ? (
                <Ctl
                  label={
                    recordingRunning
                      ? "Stop Record"
                      : "Record"
                  }
                  active={recordingRunning}
                  danger={recordingRunning}
                  onClick={() =>
                    void toggleRecording()
                  }
                >
                  {recordingRunning ? (
                    <Square />
                  ) : (
                    <Radio />
                  )}
                </Ctl>
              ) : null}

              {mode === "student" ? (
                <Ctl
                  label={
                    localPeer?.isHandRaised
                      ? "Hand Raised"
                      : "Raise Hand"
                  }
                  active={Boolean(
                    localPeer?.isHandRaised
                  )}
                  onClick={() =>
                    void raiseHand()
                  }
                >
                  <Hand />
                </Ctl>
              ) : null}

              <Ctl
                label="Chat"
                active={tab === "chat"}
                onClick={() => setTab("chat")}
              >
                <MessageCircle />
              </Ctl>
              <Ctl
                label="PDF"
                active={tab === "pdf"}
                onClick={() => setTab("pdf")}
              >
                <FileText />
              </Ctl>
              <Ctl
                label="Files"
                active={tab === "files"}
                onClick={() => setTab("files")}
              >
                <Download />
              </Ctl>
              <Ctl
                label="People"
                active={tab === "people"}
                onClick={() => setTab("people")}
              >
                <Users />
              </Ctl>
              <Ctl
                label="Devices"
                active={settings}
                onClick={() =>
                  setSettings(!settings)
                }
              >
                <Settings />
              </Ctl>
              <Ctl
                label="Fullscreen"
                onClick={() =>
                  void goFullscreen()
                }
              >
                <Maximize2 />
              </Ctl>

              <button
                type="button"
                onClick={() =>
                  mode === "teacher"
                    ? void endClass()
                    : void leaveRoom()
                }
                className="ml-auto flex min-w-[74px] shrink-0 flex-col items-center gap-1 rounded-xl bg-red-600 px-2 py-2 text-[9px] font-black text-white"
              >
                <X className="h-4 w-4" />
                {mode === "teacher"
                  ? "End Class"
                  : "Leave"}
              </button>
            </div>

            {settings && !minimized ? (
              <div className="mt-2 grid gap-2 rounded-2xl border bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
                <DeviceSelect
                  label="Microphone"
                  devices={devices.filter(
                    (device) =>
                      device.kind === "audioinput"
                  )}
                  onChange={(id) =>
                    void changeDevice(
                      "audioinput",
                      id
                    )
                  }
                />
                <DeviceSelect
                  label="Camera"
                  devices={devices.filter(
                    (device) =>
                      device.kind === "videoinput"
                  )}
                  onChange={(id) =>
                    void changeDevice(
                      "videoinput",
                      id
                    )
                  }
                />
                <DeviceSelect
                  label="Speaker"
                  devices={devices.filter(
                    (device) =>
                      device.kind === "audiooutput"
                  )}
                  onChange={(id) =>
                    void changeDevice(
                      "audiooutput",
                      id
                    )
                  }
                />
                <label className="text-[10px] font-black text-slate-600">
                  Output Volume
                  <div className="mt-1 flex min-h-10 items-center gap-2 rounded-xl border bg-white px-2">
                    {outputVolume === 0 ? (
                      <VolumeX className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-[#174699]" />
                    )}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={outputVolume}
                      onChange={(event) =>
                        setOutputVolume(
                          Number(event.target.value)
                        )
                      }
                      className="min-w-0 flex-1 accent-[#174699]"
                      aria-label="Output volume"
                    />
                    <span className="w-8 text-right text-[9px] text-slate-400">
                      {Math.round(outputVolume * 100)}%
                    </span>
                  </div>
                </label>
              </div>
            ) : null}

            {mode === "teacher" &&
            !minimized ? (
              <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border bg-white p-3">
                <button
                  type="button"
                  onClick={() =>
                    void muteAudience()
                  }
                  className="rounded-xl border px-3 py-2 text-[10px] font-black"
                >
                  <MicOff className="mr-1 inline h-3.5 w-3.5" />
                  Mute Audience
                </button>

                <div className="flex items-center gap-1 rounded-xl border p-1">
                  <Lightbulb className="mx-2 h-4 w-4 text-amber-500" />
                  {[
                    "auto",
                    "teaching",
                    "presentation",
                    "off",
                  ].map((scene) => (
                    <button
                      key={scene}
                      type="button"
                      onClick={() =>
                        void setLight(scene)
                      }
                      className={`rounded-lg px-2 py-1.5 text-[9px] font-black capitalize ${
                        lighting === scene
                          ? "bg-amber-100 text-amber-800"
                          : "text-slate-500"
                      }`}
                    >
                      {scene}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {!minimized ? (
            <aside className="min-h-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="flex gap-1 overflow-x-auto border-b bg-slate-50 p-1">
                {[
                  [
                    "chat",
                    "Live Chat",
                    MessageCircle,
                  ],
                  ["pdf", "PDF", FileText],
                  [
                    "files",
                    "Class Files",
                    Download,
                  ],
                  ["people", "People", Users],
                ].map(
                  ([key, label, Icon]: any) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setTab(key)
                      }
                      className={`flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-black ${
                        tab === key
                          ? "bg-white text-[#174699] shadow"
                          : "text-slate-500"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  )
                )}
              </div>

              {tab === "chat" ? (
                <LiveRoomChat
                  mode={mode}
                  profile={data?.profile}
                />
              ) : null}

              {tab === "pdf" ||
              tab === "files" ? (
                <ResourcesPanel
                  resources={
                    liveClass?.resources || []
                  }
                  pdfOnly={tab === "pdf"}
                  teacher={mode === "teacher"}
                  uploading={uploading}
                  resourceType={resourceType}
                  setResourceType={
                    setResourceType
                  }
                  uploadRef={uploadRef}
                  uploadResource={uploadResource}
                />
              ) : null}

              {tab === "people" ? (
                <PeoplePanel
                  peers={peers}
                  teacher={mode === "teacher"}
                  promote={promote}
                  demote={demote}
                  speakerRole={speakerRole}
                />
              ) : null}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export function LiveTeleclassRoom({
  classId,
  mode,
}: {
  classId: string;
  mode: "student" | "teacher";
}) {
  return (
    <HMSRoomProvider leaveOnUnload>
      <RoomInside
        classId={classId}
        mode={mode}
      />
    </HMSRoomProvider>
  );
}

function Ctl({
  label,
  onClick,
  children,
  active = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactElement<{
    className?: string;
  }>;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[70px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] font-black transition ${
        danger
          ? "bg-red-600"
          : active
            ? "bg-white/15"
            : "hover:bg-white/10"
      }`}
    >
      {React.cloneElement(children, {
        className: "h-4 w-4",
      })}
      {label}
    </button>
  );
}

function DeviceSelect({
  label,
  devices,
  onChange,
}: {
  label: string;
  devices: MediaDeviceInfo[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="text-[10px] font-black text-slate-600">
      {label}
      <select
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 min-h-10 w-full rounded-xl border bg-white px-2 text-xs"
      >
        <option value="">System default</option>
        {devices.map((device) => (
          <option
            key={device.deviceId}
            value={device.deviceId}
          >
            {device.label ||
              `${label} ${device.deviceId.slice(
                0,
                5
              )}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResourcesPanel({
  resources,
  pdfOnly,
  teacher,
  uploading,
  resourceType,
  setResourceType,
  uploadRef,
  uploadResource,
}: {
  resources: AnyRow[];
  pdfOnly: boolean;
  teacher: boolean;
  uploading: boolean;
  resourceType: string;
  setResourceType: (value: string) => void;
  uploadRef: React.RefObject<HTMLInputElement | null>;
  uploadResource: (file: File) => Promise<void>;
}) {
  const rows = pdfOnly
    ? resources.filter(
        (resource) =>
          resource.resource_type === "pdf" ||
          resource.mime_type ===
            "application/pdf"
      )
    : resources;

  const [selectedId, setSelectedId] =
    React.useState("");

  React.useEffect(() => {
    if (
      pdfOnly &&
      rows.length &&
      !rows.some(
        (row) => row.id === selectedId
      )
    ) {
      setSelectedId(rows[0].id);
    }
  }, [pdfOnly, rows, selectedId]);

  const selected = rows.find(
    (row) => row.id === selectedId
  );

  return (
    <div className="p-3">
      {teacher ? (
        <div className="mb-3 rounded-xl border bg-blue-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={resourceType}
              onChange={(event) =>
                setResourceType(
                  event.target.value
                )
              }
              className="min-h-9 rounded-lg border bg-white px-2 text-xs font-bold"
            >
              <option value="pdf">PDF</option>
              <option value="slides">
                Slides
              </option>
              <option value="notes">
                Notes
              </option>
              <option value="file">
                Class File
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                uploadRef.current?.click()
              }
              disabled={uploading}
              className="rounded-lg bg-[#174699] px-3 py-2 text-[10px] font-black text-white disabled:opacity-50"
            >
              {uploading
                ? "Uploading…"
                : "Upload PDF / File"}
            </button>

            <input
              ref={uploadRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.ppt,.pptx"
              className="hidden"
              onChange={(event) => {
                const file =
                  event.target.files?.[0];
                if (file) {
                  void uploadResource(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {rows.map((resource) => (
          <button
            key={resource.id}
            type="button"
            onClick={() =>
              setSelectedId(resource.id)
            }
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
              selected?.id === resource.id
                ? "border-blue-300 bg-blue-50"
                : "bg-white"
            }`}
          >
            <FileText className="h-5 w-5 text-red-600" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-black">
                {resource.title}
              </div>
              <div className="text-[9px] uppercase text-slate-400">
                {resource.resource_type}
              </div>
            </div>
            {resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                onClick={(event) =>
                  event.stopPropagation()
                }
                aria-label="Download resource"
              >
                <Download className="h-4 w-4 text-[#174699]" />
              </a>
            ) : null}
          </button>
        ))}
      </div>

      {!rows.length ? (
        <div className="py-10 text-center text-xs font-semibold text-slate-400">
          No {pdfOnly ? "PDF" : "class"}{" "}
          resources yet.
        </div>
      ) : null}

      {pdfOnly && selected?.url ? (
        <div className="mt-3 overflow-hidden rounded-xl border bg-slate-100">
          <iframe
            src={`${selected.url}#toolbar=1&view=FitH`}
            title={selected.title}
            className="h-[58vh] min-h-[420px] w-full border-0 bg-white"
          />
        </div>
      ) : null}
    </div>
  );
}

function PeoplePanel({
  peers,
  teacher,
  promote,
  demote,
  speakerRole,
}: {
  peers: AnyRow[];
  teacher: boolean;
  promote: (peer: AnyRow) => Promise<void>;
  demote: (peer: AnyRow) => Promise<void>;
  speakerRole: string;
}) {
  return (
    <div className="space-y-2 p-3">
      {peers.map((peer) => (
        <div
          key={peer.id}
          className="flex items-center gap-3 rounded-xl border p-3"
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-xs font-black text-[#174699]">
            {String(peer.name || "?")
              .split(/\s+/)
              .map((part: string) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-black">
              {peer.name}
            </div>
            <div className="text-[9px] text-slate-400">
              {peer.roleName}
              {peer.isHandRaised
                ? " · ✋ Hand raised"
                : ""}
            </div>
          </div>

          {teacher &&
          peer.isHandRaised &&
          String(
            peer.roleName || ""
          ).toLowerCase() !==
            speakerRole.toLowerCase() ? (
            <button
              type="button"
              onClick={() =>
                void promote(peer)
              }
              className="rounded-lg bg-green-600 px-2 py-1.5 text-[9px] font-black text-white"
            >
              Allow Mic
            </button>
          ) : null}

          {teacher &&
          String(
            peer.roleName || ""
          ).toLowerCase() ===
            speakerRole.toLowerCase() ? (
            <button
              type="button"
              onClick={() => void demote(peer)}
              className="rounded-lg border px-2 py-1.5 text-[9px] font-black"
            >
              Viewer
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
