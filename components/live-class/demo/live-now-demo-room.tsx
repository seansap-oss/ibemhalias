"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Copy,
  FileText,
  Hand,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  Play,
  Radio,
  RotateCcw,
  Send,
  Smile,
  Square,
  Users,
  Vote,
  X,
} from "lucide-react";

type ViewMode = "camera" | "screen" | "pdf";
type SideTab = "people" | "chat" | "hands" | "polls";

type ChatMessage = {
  id: string;
  name: string;
  body: string;
  mine?: boolean;
};

type PollState = {
  active: boolean;
  question: string;
  options: Array<{ label: string; votes: number }>;
  voted: number | null;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((value) => String(value).padStart(2, "0")).join(":");
}

export function LiveNowDemoRoom({
  classId,
  mode,
}: {
  classId: string;
  mode: "student" | "teacher";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [view, setView] = useState<ViewMode>("camera");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [sideTab, setSideTab] = useState<SideTab>("people");
  const [elapsed, setElapsed] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [chatText, setChatText] = useState("");
  const [reaction, setReaction] = useState("");
  const [notice, setNotice] = useState("Live Now is ready.");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      name: "Live Now",
      body: "Class chat is ready.",
    },
  ]);
  const [poll, setPoll] = useState<PollState>({
    active: false,
    question: "Which topic should we revise first?",
    options: [
      { label: "Polity", votes: 0 },
      { label: "History", votes: 0 },
      { label: "Current Affairs", votes: 0 },
    ],
    voted: null,
  });

  const activeStream = useMemo(() => {
    if (view === "screen" && screenStream) return screenStream;
    if (view === "camera") return cameraStream;
    return null;
  }, [cameraStream, screenStream, view]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = activeStream;
    if (activeStream) videoRef.current.play().catch(() => undefined);
  }, [activeStream]);

  useEffect(() => {
    return () => {
      stopStream(cameraStreamRef.current);
      stopStream(screenStreamRef.current);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      if (pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  async function startCamera() {
    if (mode !== "teacher") return;
    try {
      if (!cameraStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        cameraStreamRef.current = stream;
        setCameraStream(stream);
        setCameraOn(stream.getVideoTracks().some((track) => track.enabled));
        setMicOn(stream.getAudioTracks().some((track) => track.enabled));
      } else {
        cameraStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
        setCameraOn(true);
      }
      setView("camera");
      setNotice("Camera is live in the Teacher Studio.");
    } catch {
      setNotice("Camera or microphone permission was blocked. Allow browser permission and try again.");
    }
  }

  function toggleCamera() {
    if (mode !== "teacher") return;
    if (!cameraStreamRef.current) {
      void startCamera();
      return;
    }
    const next = !cameraOn;
    cameraStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraOn(next);
    if (next) setView("camera");
    setNotice(next ? "Camera on." : "Camera off.");
  }

  function toggleMic() {
    if (mode !== "teacher") return;
    if (!cameraStreamRef.current) {
      void startCamera();
      return;
    }
    const next = !micOn;
    cameraStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
    setNotice(next ? "Microphone on." : "Microphone muted.");
  }

  async function shareScreen() {
    if (mode !== "teacher") return;
    try {
      stopStream(screenStreamRef.current);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setView("screen");
      setNotice("Screen share active.");
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenStream(null);
        screenStreamRef.current = null;
        setView("camera");
        setNotice("Screen share ended.");
      });
    } catch {
      setNotice("Screen sharing was cancelled or blocked.");
    }
  }

  function loadPdf(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setNotice("Please select a PDF file.");
      return;
    }
    if (pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
    const nextUrl = URL.createObjectURL(file);
    setPdfUrl(nextUrl);
    setPdfName(file.name);
    setView("pdf");
    setNotice(`Presenting ${file.name}`);
  }

  function toggleHand() {
    const next = !handRaised;
    setHandRaised(next);
    setSideTab("hands");
    setNotice(next ? "Hand raised." : "Hand lowered.");
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const value = chatText.trim();
    if (!value) return;
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        name: mode === "teacher" ? "Teacher" : "Student",
        body: value,
        mine: true,
      },
    ]);
    setChatText("");
    setSideTab("chat");
  }

  function showReaction(value: string) {
    setReaction(value);
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => setReaction(""), 1800);
  }

  async function copyClassLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Class link copied.");
    } catch {
      setNotice("Could not copy the class link.");
    }
  }

  function startPoll() {
    setPoll((current) => ({
      ...current,
      active: true,
      voted: null,
      options: current.options.map((option) => ({ ...option, votes: 0 })),
    }));
    setSideTab("polls");
    setNotice("Poll started.");
  }

  function closePoll() {
    setPoll((current) => ({ ...current, active: false }));
    setNotice("Poll closed.");
  }

  function vote(index: number) {
    if (!poll.active || poll.voted !== null) return;
    setPoll((current) => ({
      ...current,
      voted: index,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, votes: option.votes + 1 } : option
      ),
    }));
  }

  function endClass() {
    stopStream(cameraStreamRef.current);
    stopStream(screenStreamRef.current);
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    setCameraStream(null);
    setScreenStream(null);
    setCameraOn(false);
    setMicOn(false);
    setView("camera");
    setNotice("Class media stopped.");
  }

  return (
    <div className="min-h-[calc(100vh-52px)] bg-slate-950 text-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => loadPdf(event.target.files?.[0])}
      />

      <div className="border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/15">
              <Radio className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight">IBEMHAL IAS · LIVE NOW</div>
              <div className="text-[11px] text-slate-400">Class {classId.slice(0, 8)}</div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black text-emerald-300">
              READY
            </span>
            <span className="font-mono text-xs font-bold text-slate-300">{formatTime(elapsed)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void copyClassLink()}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold hover:bg-white/10"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Invite</span>
            </button>
            {mode === "teacher" ? (
              <button
                type="button"
                onClick={endClass}
                className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-xs font-black hover:bg-red-400"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                End
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-108px)] max-w-[1700px] gap-4 p-3 lg:grid-cols-[1fr_340px] lg:p-4">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            <span className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              LIVE NOW
            </span>
            <span className="rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold text-slate-200 backdrop-blur">
              {view === "camera" ? "Camera" : view === "screen" ? "Screen Share" : pdfName || "Document"}
            </span>
          </div>

          {reaction ? (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="animate-bounce text-7xl drop-shadow-2xl">{reaction}</div>
            </div>
          ) : null}

          <div className="flex min-h-[66vh] items-center justify-center">
            {view === "pdf" && pdfUrl ? (
              <iframe
                src={pdfUrl}
                title={pdfName || "Live Now PDF"}
                className="h-[74vh] w-full bg-white"
              />
            ) : activeStream ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-[74vh] w-full object-contain"
              />
            ) : (
              <div className="max-w-xl px-8 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/20">
                  <Play className="h-9 w-9 text-indigo-300" />
                </div>
                <h2 className="text-2xl font-black">
                  {mode === "teacher" ? "Live Now Teacher Studio" : "Live Now Classroom"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {mode === "teacher"
                    ? "Start the camera, present your screen or open a PDF to begin."
                    : "The classroom is ready. Use chat, reactions, polls and Raise Hand from the panel."}
                </p>
                {mode === "teacher" ? (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-indigo-500 px-5 text-sm font-black hover:bg-indigo-400"
                  >
                    <Camera className="h-4 w-4" />
                    Start camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleHand}
                    className={`mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 text-sm font-black ${
                      handRaised ? "bg-amber-400 text-slate-950" : "bg-indigo-500 text-white hover:bg-indigo-400"
                    }`}
                  >
                    <Hand className="h-4 w-4" />
                    {handRaised ? "Lower hand" : "Raise hand"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 z-20 flex max-w-[94%] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-black/75 p-2 backdrop-blur">
            {mode === "teacher" ? (
              <>
                <button type="button" onClick={toggleMic} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500/90 hover:bg-red-400"}`} title="Microphone">
                  {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>
                <button type="button" onClick={toggleCamera} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cameraOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500/90 hover:bg-red-400"}`} title="Camera">
                  {cameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
                </button>
                <button type="button" onClick={() => void shareScreen()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20" title="Share screen">
                  <MonitorUp className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20" title="Present PDF">
                  <FileText className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setView("camera")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20" title="Back to camera">
                  <RotateCcw className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={toggleHand}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black ${
                  handRaised ? "bg-amber-400 text-slate-950" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                <Hand className="h-4 w-4" />
                {handRaised ? "Hand raised" : "Raise hand"}
              </button>
            )}

            <div className="mx-1 h-7 w-px shrink-0 bg-white/10" />

            {["👏", "👍", "❤️", "🎉"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => showReaction(emoji)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg hover:bg-white/20"
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>

        <aside className="flex min-h-[540px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
          <div className="grid grid-cols-4 border-b border-white/10">
            {[
              { tab: "people" as SideTab, Icon: Users, label: "People" },
              { tab: "chat" as SideTab, Icon: MessageCircle, label: "Chat" },
              { tab: "hands" as SideTab, Icon: Hand, label: "Hands" },
              { tab: "polls" as SideTab, Icon: Vote, label: "Polls" },
            ].map(({ tab, Icon, label }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSideTab(tab)}
                className={`flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-black ${
                  sideTab === tab ? "bg-indigo-500/15 text-indigo-300" : "text-slate-400 hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sideTab === "people" ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black">Participants</div>
                    <div className="text-xs text-slate-500">Classroom members</div>
                  </div>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                    1
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-black text-indigo-300">
                      {mode === "teacher" ? "T" : "S"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">
                        {mode === "teacher" ? "Teacher (You)" : "Student (You)"}
                      </div>
                      <div className="text-[11px] text-emerald-400">Connected</div>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void copyClassLink()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold hover:bg-white/10"
                >
                  <Copy className="h-4 w-4" />
                  Copy class link
                </button>
              </div>
            ) : null}

            {sideTab === "chat" ? (
              <div className="flex min-h-[430px] flex-col">
                <div className="mb-3">
                  <div className="text-sm font-black">Class chat</div>
                  <div className="text-xs text-slate-500">Messages during the session</div>
                </div>

                <div className="flex-1 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-2xl p-3 ${
                        message.mine ? "ml-6 bg-indigo-500/20" : "mr-6 bg-white/5"
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        {message.name}
                      </div>
                      <div className="mt-1 text-sm leading-5 text-slate-200">{message.body}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={sendMessage} className="mt-4 flex gap-2">
                  <input
                    value={chatText}
                    onChange={(event) => setChatText(event.target.value)}
                    placeholder="Type a message…"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm outline-none focus:border-indigo-400"
                  />
                  <button
                    type="submit"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-400"
                    title="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : null}

            {sideTab === "hands" ? (
              <div>
                <div className="mb-3">
                  <div className="text-sm font-black">Raise Hand</div>
                  <div className="text-xs text-slate-500">Questions and speaking requests</div>
                </div>

                {handRaised ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                        <Hand className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black">
                          {mode === "teacher" ? "Teacher" : "Student"}
                        </div>
                        <div className="text-xs text-amber-200">Hand is raised</div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleHand}
                        className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
                        title="Lower hand"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <Hand className="mx-auto h-7 w-7 text-slate-600" />
                    <div className="mt-3 text-sm font-bold text-slate-300">No hands raised</div>
                    <div className="mt-1 text-xs text-slate-500">Raised hands will appear here.</div>
                    {mode === "student" ? (
                      <button
                        type="button"
                        onClick={toggleHand}
                        className="mt-4 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950"
                      >
                        Raise my hand
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            {sideTab === "polls" ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black">Live polls</div>
                    <div className="text-xs text-slate-500">Quick class engagement</div>
                  </div>
                  {mode === "teacher" ? (
                    poll.active ? (
                      <button
                        type="button"
                        onClick={closePoll}
                        className="rounded-lg bg-red-500/15 px-2.5 py-1.5 text-[10px] font-black text-red-300"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startPoll}
                        className="rounded-lg bg-indigo-500 px-2.5 py-1.5 text-[10px] font-black"
                      >
                        Start poll
                      </button>
                    )
                  ) : null}
                </div>

                {poll.active ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-black leading-5">{poll.question}</div>
                    <div className="mt-4 space-y-2">
                      {poll.options.map((option, index) => {
                        const totalVotes = poll.options.reduce((sum, item) => sum + item.votes, 0);
                        const percent = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => vote(index)}
                            disabled={poll.voted !== null}
                            className={`w-full overflow-hidden rounded-xl border text-left ${
                              poll.voted === index
                                ? "border-indigo-400 bg-indigo-500/20"
                                : "border-white/10 bg-slate-950 hover:border-white/20"
                            }`}
                          >
                            <div className="relative px-3 py-3">
                              <div
                                className="absolute inset-y-0 left-0 bg-indigo-500/10"
                                style={{ width: `${percent}%` }}
                              />
                              <div className="relative flex items-center justify-between gap-3 text-xs">
                                <span className="font-bold">{option.label}</span>
                                <span className="text-slate-400">{percent}%</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {poll.voted !== null ? (
                      <div className="mt-3 text-[11px] font-bold text-emerald-400">Vote submitted.</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <Vote className="mx-auto h-7 w-7 text-slate-600" />
                    <div className="mt-3 text-sm font-bold text-slate-300">No active poll</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {mode === "teacher" ? "Start a poll when you are ready." : "Teacher polls will appear here."}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <div className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-300">{notice}</div>
              <button
                type="button"
                onClick={() => showReaction("👏")}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
                title="Reaction"
              >
                <Smile className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
