"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Flag,
  Link2,
  Loader2,
  MoreVertical,
  Paperclip,
  Pin,
  Reply,
  Search,
  Send,
  Smile,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;

const REACTIONS = ["ðŸ‘", "â¤ï¸", "ðŸ˜‚", "ðŸ™"];

function colorFor(key: string) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 68% 40%)`;
}

function youtubeEmbed(url: string) {
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.slice(1);
    } else {
      id =
        parsed.searchParams.get("v") ||
        parsed.pathname.split("/").filter(Boolean).pop() ||
        "";
    }
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
  } catch {
    return "";
  }
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function renderMessageBody(
  body: string,
  currentUsername?: string
) {
  const parts = String(body || "").split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (!part.startsWith("@")) {
      return <React.Fragment key={index}>{part}</React.Fragment>;
    }
    const username = part.slice(1);
    const mine =
      currentUsername &&
      username.toLowerCase() === currentUsername.toLowerCase();
    return (
      <span
        key={index}
        className={`rounded px-0.5 font-black ${
          mine
            ? "bg-amber-100 text-amber-800"
            : "bg-blue-50 text-[#174699]"
        }`}
      >
        {part}
      </span>
    );
  });
}

async function optimizeImageUpload(file: File) {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.size < 900 * 1024
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(
      1,
      maxSide / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const outputType =
      file.type === "image/png" ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.82)
    );
    if (!blob || blob.size >= file.size) return file;

    const stem = file.name.replace(/\.[^.]+$/, "");
    const extension = outputType === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${stem}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function ExpandMedia({
  open,
  onClose,
  src,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  kind: "youtube" | "video" | "image";
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  if (!open) return null;

  const goFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen?.();
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      await orientation?.lock?.("landscape");
    } catch {
      // Browsers may reject orientation lock unless already fullscreen.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] grid place-items-center bg-black/90 p-3"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-xl bg-black"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white"
          aria-label="Close expanded media"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={goFullscreen}
          className="absolute right-16 top-3 z-20 rounded-full bg-black/60 px-3 py-2 text-xs font-black text-white"
        >
          16:9 Fullscreen
        </button>

        {kind === "youtube" ? (
          <iframe
            src={youtubeEmbed(src)}
            title="Expanded video"
            className="h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : kind === "video" ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-contain" />
        )}
      </div>
    </div>
  );
}

function Attachment({ message }: { message: AnyRow }) {
  const [expanded, setExpanded] = React.useState(false);
  const src = message.attachment_url || message.external_url || "";
  if (!src) return null;

  if (message.attachment_type === "image") {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="block overflow-hidden rounded-xl border bg-slate-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={message.attachment_name || "Chat image"}
            className="max-h-56 w-auto max-w-full object-contain"
          />
        </button>
        <ExpandMedia
          open={expanded}
          onClose={() => setExpanded(false)}
          src={src}
          kind="image"
        />
      </div>
    );
  }

  if (message.attachment_type === "youtube") {
    const embed = youtubeEmbed(src);
    return (
      <div className="mt-2 max-w-md overflow-hidden rounded-xl border bg-slate-950">
        {embed ? (
          <iframe
            src={embed}
            title="Video preview"
            className="aspect-video w-full border-0"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-9 w-full items-center justify-center gap-2 bg-white text-xs font-black text-[#14256f]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Expand
        </button>
        <ExpandMedia
          open={expanded}
          onClose={() => setExpanded(false)}
          src={src}
          kind="youtube"
        />
      </div>
    );
  }

  if (message.attachment_type === "video") {
    return (
      <div className="mt-2 max-w-md overflow-hidden rounded-xl border bg-black">
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full"
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-9 w-full items-center justify-center gap-2 bg-white text-xs font-black text-[#14256f]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Expand
        </button>
        <ExpandMedia
          open={expanded}
          onClose={() => setExpanded(false)}
          src={src}
          kind="video"
        />
      </div>
    );
  }

  if (message.attachment_type === "link") {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex max-w-md items-center gap-3 rounded-xl border bg-white p-3 transition hover:bg-blue-50"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#174699]">
          <Link2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-black text-slate-800">
            {hostLabel(src)}
          </div>
          <div className="truncate text-[10px] text-slate-500">{src}</div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex max-w-md items-center gap-3 rounded-xl border bg-white p-3"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-black text-slate-800">
          {message.attachment_name || "Attachment"}
        </div>
        <div className="text-[10px] uppercase text-slate-400">
          {message.attachment_type}
        </div>
      </div>
      <Download className="h-4 w-4 text-[#174699]" />
    </a>
  );
}

export function CommunityChat({
  liveClassId,
  compact = false,
  adminMode = false,
}: {
  liveClassId?: string;
  compact?: boolean;
  adminMode?: boolean;
}) {
  const [rooms, setRooms] = React.useState<AnyRow[]>([]);
  const [roomId, setRoomId] = React.useState("");
  const [messages, setMessages] = React.useState<AnyRow[]>([]);
  const [pinned, setPinned] = React.useState<AnyRow[]>([]);
  const [actor, setActor] = React.useState<AnyRow | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
  const [link, setLink] = React.useState("");
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<AnyRow | null>(null);
  const [upload, setUpload] = React.useState<AnyRow | null>(null);
  const [presence, setPresence] = React.useState<Record<string, AnyRow>>({});
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState("");
  const [hasMore, setHasMore] = React.useState(false);
  const [nextBefore, setNextBefore] = React.useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = React.useState(false);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const realtimeRef = React.useRef<any>(null);

  const adminHeader = React.useMemo<Record<string, string>>(
    () => {
      const headers: Record<string, string> = {};
      if (adminMode) {
        headers["X-Ibemhal-Admin"] = "1";
      }
      return headers;
    },
    [adminMode]
  );

  const loadRooms = React.useCallback(async () => {
    const query = liveClassId
      ? `?classId=${encodeURIComponent(liveClassId)}`
      : "";
    const response = await fetch(`/api/chat/rooms${query}`, {
      cache: "no-store",
      headers: adminHeader,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load chat rooms");
    }

    setRooms(payload.rooms || []);
    setActor(payload.actor || null);
    setRoomId((current) =>
      current && (payload.rooms || []).some((room: AnyRow) => room.id === current)
        ? current
        : payload.rooms?.[0]?.id || ""
    );
  }, [liveClassId, adminHeader]);

  const loadMessages = React.useCallback(
    async (options?: {
      before?: string | null;
      prepend?: boolean;
    }) => {
      if (!roomId) return;
      const beforeQuery = options?.before
        ? `&before=${encodeURIComponent(options.before)}`
        : "";
      const response = await fetch(
        `/api/chat/messages?roomId=${encodeURIComponent(
          roomId
        )}${beforeQuery}`,
        {
          cache: "no-store",
          headers: adminHeader,
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error || "Unable to load messages"
        );
      }

      setMessages((current) =>
        options?.prepend
          ? [...(payload.messages || []), ...current]
          : payload.messages || []
      );
      setPinned(payload.pinned || []);
      if (payload.actor) setActor(payload.actor);
      setHasMore(Boolean(payload.hasMore));
      setNextBefore(payload.nextBefore || null);

      if (!options?.prepend) {
        fetch("/api/chat/read", {
          method: "POST",
          headers: {
            ...adminHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId }),
        }).catch(() => {});
      }
    },
    [roomId, adminHeader]
  );

  React.useEffect(() => {
    setBusy(true);
    loadRooms()
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusy(false));
  }, [loadRooms]);

  React.useEffect(() => {
    if (roomId) {
      loadMessages().catch((err: Error) => setError(err.message));
    }
  }, [roomId, loadMessages]);

  React.useEffect(() => {
    if (!actor?.isAdmin || !roomId) return;
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [actor?.isAdmin, roomId, loadMessages]);

  React.useEffect(() => {
    const supabase = createClient();
    if (!supabase || !roomId || !actor) return;

    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
    }

    const channel = supabase
      .channel(`ibemhal-chat-${roomId}`, {
        config: {
          private: true,
          presence: { key: actor.userId },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadMessages();
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, AnyRow[]>;
        const next: Record<string, AnyRow> = {};
        Object.entries(state).forEach(([key, values]) => {
          next[key] = Array.isArray(values)
            ? values[values.length - 1]
            : values;
        });
        setPresence(next);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: actor.userId,
            name: actor.fullName,
            username: actor.username,
            role: actor.role,
            color: colorFor(actor.userId),
            online_at: new Date().toISOString(),
          });
        }
      });

    realtimeRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      realtimeRef.current = null;
    };
  }, [roomId, actor, loadMessages]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  const send = async () => {
    if (sending || (!text.trim() && !link.trim() && !upload)) return;

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          ...adminHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          body: text.trim(),
          externalUrl: link.trim(),
          replyTo: replyTo?.id || null,
          attachmentType: upload?.type || null,
          attachmentPath: upload?.path || null,
          attachmentName: upload?.name || null,
          attachmentMime: upload?.mime || null,
          attachmentSize: upload?.size || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Send failed");
      }

      setText("");
      setLink("");
      setLinkOpen(false);
      setUpload(null);
      setReplyTo(null);
      await loadMessages();
    } catch (err: any) {
      setError(err?.message || "Send failed.");
    } finally {
      setSending(false);
    }
  };

  const uploadFile = async (file: File) => {
    setSending(true);
    setError("");
    try {
      const preparedFile = await optimizeImageUpload(file);
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        headers: {
          ...adminHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          fileName: preparedFile.name,
          mime: preparedFile.type,
          size: preparedFile.size,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error || "Unable to prepare upload."
        );
      }

      const supabase = createClient();
      if (!supabase) {
        throw new Error(
          "Supabase client is unavailable."
        );
      }

      const prepared = payload.upload;
      const { error: uploadError } =
        await supabase.storage
          .from(prepared.bucket)
          .uploadToSignedUrl(
            prepared.path,
            prepared.token,
            preparedFile,
            {
              contentType: preparedFile.type,
            }
          );
      if (uploadError) throw uploadError;

      setUpload({
        type: prepared.type,
        path: prepared.path,
        name: prepared.name,
        mime: prepared.mime,
        size: prepared.size,
      });
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setSending(false);
    }
  };

  const reactTo = async (messageId: string, emoji: string) => {
    await fetch("/api/chat/reactions", {
      method: "POST",
      headers: {
        ...adminHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messageId, emoji }),
    });
    await loadMessages();
  };

  const report = async (messageId: string) => {
    if (
      !window.confirm(
        "Report this message to the Ibemhal IAS admin team?"
      )
    ) {
      return;
    }
    await fetch("/api/chat/report", {
      method: "POST",
      headers: {
        ...adminHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messageId,
        reason: "inappropriate",
      }),
    });
    window.alert("Reported to the admin team.");
  };

  const moderate = async (
    action: string,
    message: AnyRow,
    extra: AnyRow = {}
  ) => {
    const response = await fetch("/api/chat/moderate", {
      method: "POST",
      headers: {
        ...adminHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        messageId: message?.id,
        roomId,
        userId: message?.user_id,
        ...extra,
      }),
    });
    if (response.ok) {
      await loadRooms();
      await loadMessages();
    }
  };

  const loadOlder = async () => {
    if (!nextBefore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      await loadMessages({
        before: nextBefore,
        prepend: true,
      });
    } catch (err: any) {
      setError(err?.message || "Unable to load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const currentRoom = rooms.find((room) => room.id === roomId);
  const filtered = messages.filter((message) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${message.author_name} ${message.author_username} ${message.body}`
      .toLowerCase()
      .includes(query);
  });
  const members = Object.values(presence);

  if (busy) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#174699]" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-0 ${
        compact
          ? ""
          : "rounded-2xl border border-slate-200 bg-white"
      }`}
    >
      {!compact ? (
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#174699]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#14256f]">
                UPSC / IAS Student Community
              </h2>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                  Registered users only
                </span>
                <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">
                  Moderated
                </span>
                <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">
                  Images / URLs / Videos supported
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chat"
              className="min-h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm lg:w-64"
            />
          </div>
          {adminMode && currentRoom ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void moderate("room_read_only", {}, {
                    readOnly: !currentRoom.is_read_only,
                  })
                }
                className={`min-h-10 rounded-xl border px-3 text-[10px] font-black ${
                  currentRoom.is_read_only
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "bg-white text-slate-600"
                }`}
              >
                {currentRoom.is_read_only ? "Read-only ON" : "Read-only"}
              </button>
              <button
                type="button"
                onClick={() =>
                  void moderate("slow_mode", {}, {
                    seconds:
                      Number(currentRoom.slow_mode_seconds || 0) > 0
                        ? 0
                        : 15,
                  })
                }
                className={`min-h-10 rounded-xl border px-3 text-[10px] font-black ${
                  Number(currentRoom.slow_mode_seconds || 0) > 0
                    ? "border-violet-300 bg-violet-50 text-violet-800"
                    : "bg-white text-slate-600"
                }`}
              >
                {Number(currentRoom.slow_mode_seconds || 0) > 0
                  ? `Slow ${currentRoom.slow_mode_seconds}s`
                  : "Slow mode"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!liveClassId ? (
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setRoomId(room.id)}
              className={`relative shrink-0 border-b-2 px-3 py-2 text-xs font-black ${
                room.id === roomId
                  ? "border-[#2d6cdf] text-[#174699]"
                  : "border-transparent text-slate-500"
              }`}
            >
              {room.name}
              {room.unread > 0 ? (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white">
                  {room.unread}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`grid min-h-0 ${
          compact ? "" : "xl:grid-cols-[minmax(0,1fr)_300px]"
        }`}
      >
        <div className="flex min-h-0 flex-col">
          <div
            className={`overflow-y-auto p-3 sm:p-4 ${
              compact
                ? "h-[420px] lg:h-[560px]"
                : "h-[60vh] min-h-[460px] max-h-[760px]"
            }`}
          >
            {hasMore ? (
              <div className="mb-4 text-center">
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={loadingOlder}
                  className="rounded-full border bg-white px-4 py-2 text-[10px] font-black text-[#174699] shadow-sm disabled:opacity-50"
                >
                  {loadingOlder ? "Loadingâ€¦" : "Load older messages"}
                </button>
              </div>
            ) : null}
            {filtered.map((message) => {
              const accent = colorFor(
                message.user_id ||
                  message.admin_actor ||
                  message.author_username
              );
              const grouped: Record<
                string,
                { emoji: string; count: number }
              > = {};

              (message.reactions || []).forEach((reaction: AnyRow) => {
                const key = reaction.emoji;
                grouped[key] = grouped[key] || {
                  emoji: key,
                  count: 0,
                };
                grouped[key].count += 1;
              });

              return (
                <div key={message.id} className="mb-3 flex gap-3">
                  <div
                    className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {initials(message.author_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_4px_15px_rgba(15,23,42,.035)]">
                      <span
                        className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
                        style={{ backgroundColor: accent }}
                      />

                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="text-xs font-black"
                              style={{ color: accent }}
                            >
                              {message.author_name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              @{message.author_username}
                            </span>
                            {message.author_role !== "student" ? (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
                                {message.author_role}
                              </span>
                            ) : null}
                            {message.is_pinned ? (
                              <Pin className="h-3 w-3 text-amber-500" />
                            ) : null}
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400">
                            {timeLabel(message.created_at)}
                          </span>
                        </div>

                        <div className="group relative">
                          <button
                            type="button"
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
                            aria-label="Message options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          <div className="invisible absolute right-0 top-7 z-30 w-36 rounded-xl border bg-white p-1 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={() => setReplyTo(message)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-bold hover:bg-slate-50"
                            >
                              <Reply className="h-3 w-3" />
                              Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => void report(message.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50"
                            >
                              <Flag className="h-3 w-3" />
                              Report
                            </button>
                            {adminMode ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void moderate("pin", message, {
                                      pinned: !message.is_pinned,
                                    })
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-bold hover:bg-slate-50"
                                >
                                  <Pin className="h-3 w-3" />
                                  {message.is_pinned ? "Unpin" : "Pin"}
                                </button>
                                {message.user_id ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void moderate("mute", message, {
                                        minutes: 60,
                                      })
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-bold text-amber-700 hover:bg-amber-50"
                                  >
                                    Mute 1 hour
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    void moderate("delete", message)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {message.reply ? (
                        <div
                          className="mt-2 rounded-lg border-l-2 bg-slate-50 p-2 text-[10px] text-slate-500"
                          style={{ borderColor: accent }}
                        >
                          <b>{message.reply.author_name}</b>
                          <div className="truncate">
                            {message.reply.body ||
                              message.reply.attachment_name}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                        {renderMessageBody(
                          message.body,
                          actor?.username
                        )}
                      </div>

                      <Attachment message={message} />

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {Object.values(grouped).map((group) => (
                          <button
                            type="button"
                            key={group.emoji}
                            onClick={() =>
                              void reactTo(message.id, group.emoji)
                            }
                            className="rounded-full border bg-slate-50 px-2 py-1 text-[10px]"
                          >
                            {group.emoji} {group.count}
                          </button>
                        ))}

                        <div className="group relative">
                          <button
                            type="button"
                            className="rounded-full px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-50"
                          >
                            ï¼‹
                          </button>
                          <div className="invisible absolute bottom-7 left-0 z-20 flex gap-1 rounded-full border bg-white p-1 opacity-0 shadow-xl group-hover:visible group-hover:opacity-100">
                            {REACTIONS.map((emoji) => (
                              <button
                                type="button"
                                key={emoji}
                                onClick={() =>
                                  void reactTo(message.id, emoji)
                                }
                                className="grid h-7 w-7 place-items-center rounded-full hover:bg-slate-100"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!filtered.length ? (
              <div className="py-16 text-center text-sm font-semibold text-slate-400">
                No messages yet. Start the discussion.
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            {replyTo ? (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs">
                <Reply className="h-3.5 w-3.5 text-[#174699]" />
                <div className="min-w-0 flex-1">
                  <b>Replying to {replyTo.author_name}</b>
                  <div className="truncate text-[10px] text-slate-500">
                    {replyTo.body || replyTo.attachment_name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  aria-label="Cancel reply"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {upload ? (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs">
                <Paperclip className="h-4 w-4 text-violet-700" />
                <div className="min-w-0 flex-1 truncate font-bold">
                  {upload.name}
                </div>
                <button
                  type="button"
                  onClick={() => setUpload(null)}
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {linkOpen ? (
              <div className="mb-2 flex gap-2">
                <input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="Paste a website or video URLâ€¦"
                  className="min-h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setLinkOpen(false)}
                  className="rounded-xl border px-3"
                  aria-label="Close URL input"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {error ? (
              <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                <button
                  type="button"
                  title="Emoji"
                  onClick={() => setText((value) => `${value} ðŸ™‚`)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white"
                >
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Attach file"
                  onClick={() => fileRef.current?.click()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Attach URL or video"
                  onClick={() => setLinkOpen((value) => !value)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white"
                >
                  <Link2 className="h-4 w-4" />
                </button>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
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
                  placeholder="Type your messageâ€¦"
                  className="max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                />
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.webm,.mov"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => void send()}
                disabled={sending}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#14256f] text-white shadow disabled:opacity-50"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>

            {!compact ? (
              <div className="mt-2 text-center text-[10px] font-semibold text-slate-400">
                Teachers and admins can pin important messages. Images,
                PDFs, files and safe URL/video previews are supported.
              </div>
            ) : null}
          </div>
        </div>

        {!compact ? (
          <aside className="hidden border-l border-slate-200 bg-slate-50/60 p-4 xl:block">
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#14256f]">
                  Active Members
                </h3>
                <span className="text-[10px] font-bold text-green-600">
                  Online {members.length}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {members.slice(0, 8).map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          member.color || colorFor(member.user_id),
                      }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-black">
                        {member.name}
                      </div>
                      <div className="truncate text-[9px] text-slate-400">
                        @{member.username}
                      </div>
                    </div>
                  </div>
                ))}
                {!members.length ? (
                  <div className="text-xs text-slate-400">
                    Presence will appear as members open this room.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#14256f]">
                <Pin className="h-4 w-4" />
                Pinned Notes
              </div>
              <div className="mt-3 space-y-2">
                {pinned.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-slate-50 p-3 text-xs"
                  >
                    <b>{item.author_name}</b>
                    <div className="mt-1 line-clamp-3 text-slate-600">
                      {item.body || item.attachment_name}
                    </div>
                  </div>
                ))}
                {!pinned.length ? (
                  <div className="text-xs text-slate-400">
                    No pinned notes yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-4">
              <div className="text-sm font-black text-[#14256f]">
                Today&apos;s Topic
              </div>
              <div className="mt-2 text-xs font-bold text-slate-700">
                {currentRoom?.name}
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-slate-500">
                {currentRoom?.description}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-4">
              <div className="text-sm font-black text-[#14256f]">
                Group Guidelines
              </div>
              <ul className="mt-3 space-y-2 text-[10px] font-semibold text-slate-600">
                <li>âœ“ Be respectful and helpful.</li>
                <li>âœ“ No promotional spam.</li>
                <li>âœ“ Stay on topic.</li>
                <li>âœ“ No personal attacks.</li>
                <li>âœ“ Report inappropriate content.</li>
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

