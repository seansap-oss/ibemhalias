"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { SITE_CONTACT } from "@/lib/site-contact";
import { branchLocations } from "@/components/portal/nav-items";

type ConciergeTab = "quick" | "ai" | "callback";

type ConciergeConfig = {
  voiceEnabled: boolean;
  autoGreetOnOpen: boolean;
  voiceAccent?: string;
  voiceGender?: string;
  voiceRate?: string;
  voiceGreeting: string;
  busyNotice: string;
  resolvedAudioUrl?: string | null;
  audioUrl?: string;
  salesPhone: string;
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
};

type CourseRecommendation = {
  id: string;
  title: string;
  examFamily: string;
  priceInr: number;
};

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
  courses?: CourseRecommendation[];
  payHref?: string;
};

const DEFAULT_CONFIG: ConciergeConfig = {
  voiceEnabled: true,
  autoGreetOnOpen: true,
  voiceGreeting:
    "Welcome to Ibemhal IAS, Manipur's low-fee Civil Services coaching institute. All counsellors may be busy with students, so I am your automated AI concierge ready to assist with admissions, branches, course advice, and fee receipts.",
  busyNotice:
    "If all counsellors are busy on call, listen to our automated guide or select Sales, Support, or AI Course Advisor below.",
  salesPhone: SITE_CONTACT.phoneDisplay,
  supportPhone: SITE_CONTACT.phoneDisplay,
  supportEmail: SITE_CONTACT.helpdeskEmail,
  whatsappNumber: SITE_CONTACT.whatsappNumber,
};

export function AiConciergeWidget() {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<ConciergeTab>("quick");
  const [config, setConfig] = React.useState<ConciergeConfig>(DEFAULT_CONFIG);
  const [branches, setBranches] = React.useState(branchLocations);
  const [speaking, setSpeaking] = React.useState(false);
  const [voiceLoading, setVoiceLoading] = React.useState(false);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  // AI Advisor State
  const [chat, setChat] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hello! Tell me which exam you are preparing for (UPSC IAS, MPSC, Banking, SSC) or ask about fees & receipts — I will recommend the best batch.",
    },
  ]);
  const [aiInput, setAiInput] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);

  // Callback Form State
  const [department, setDepartment] = React.useState<"sales" | "support" | "coaching">("sales");
  const [leadName, setLeadName] = React.useState("");
  const [leadPhone, setLeadPhone] = React.useState("");
  const [leadEmail, setLeadEmail] = React.useState("");
  const [leadMsg, setLeadMsg] = React.useState("");
  const [leadBusy, setLeadBusy] = React.useState(false);
  const [leadDone, setLeadDone] = React.useState<string | null>(null);
  const [leadErr, setLeadErr] = React.useState<string | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = React.useRef<string | null>(null);
  const ttsAbortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    fetch("/api/support/concierge", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config) {
          setConfig((prev) => ({ ...prev, ...data.config }));
        }
        if (Array.isArray(data?.branches) && data.branches.length > 0) {
          setBranches(data.branches);
        }
      })
      .catch(() => undefined);
  }, []);

  const stopVoice = React.useCallback(() => {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceLoading(false);
    setSpeaking(false);
  }, []);

  const playBrowserFallback = React.useCallback((textToSpeak: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window && textToSpeak) {
      try {
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.rate = 0.98;
        utter.pitch = 1;
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        setSpeaking(true);
        window.speechSynthesis.speak(utter);
      } catch {
        setSpeaking(false);
      }
    }
  }, []);

  const speakText = React.useCallback(
    async (textToSpeak: string, audioSrc?: string | null) => {
      stopVoice();
      if (audioSrc) {
        const audio = new Audio(audioSrc);
        audioRef.current = audio;
        setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => {
          setSpeaking(false);
        };
        audio.play().catch(() => setSpeaking(false));
        return;
      }

      if (!textToSpeak.trim()) return;

      const controller = new AbortController();
      ttsAbortRef.current = controller;
      setVoiceLoading(true);
      try {
        const res = await fetch("/api/support/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToSpeak,
            accent: config.voiceAccent || "en-IN",
            gender: config.voiceGender || "female",
            rate: config.voiceRate || "1.0",
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("TTS request failed");
        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setVoiceLoading(false);
        setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
      } catch (err: any) {
        setVoiceLoading(false);
        if (err?.name !== "AbortError") {
          playBrowserFallback(textToSpeak);
        }
      }
    },
    [config.voiceAccent, config.voiceGender, config.voiceRate, playBrowserFallback, stopVoice]
  );

  const openWidget = React.useCallback(
    (targetTab?: ConciergeTab, autoSpeak = false) => {
      if (targetTab) setTab(targetTab);
      setOpen(true);
      if (autoSpeak && config.voiceEnabled && config.autoGreetOnOpen) {
        speakText(config.voiceGreeting, config.resolvedAudioUrl || config.audioUrl || null);
      }
    },
    [config, speakText]
  );

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: ConciergeTab }>).detail;
      openWidget(detail?.tab || "quick", true);
    };
    window.addEventListener("ibemhal:open-concierge", handler);
    return () => {
      window.removeEventListener("ibemhal:open-concierge", handler);
    };
  }, [openWidget]);

  React.useEffect(() => {
    return () => stopVoice();
  }, [stopVoice]);

  const copyValue = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {}
  };

  const askAi = async (question: string) => {
    const q = question.trim();
    if (!q || aiLoading) return;
    setChat((prev) => [...prev, { role: "user", text: q }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/support/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ask_ai", message: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not get recommendation");
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || "Here are the programmes tailored to your goal.",
          courses: data.recommendedCourses || [],
          payHref: data.payHref || "/courses",
        },
      ]);
    } catch (err: any) {
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err?.message || `Please call ${config.salesPhone} for live counselling.`,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadErr(null);
    setLeadDone(null);
    setLeadBusy(true);
    try {
      const res = await fetch("/api/support/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_lead",
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
          department,
          message: leadMsg,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send message");
      setLeadDone(data.message || "Submitted! Our team will contact you shortly.");
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      setLeadMsg("");
    } catch (err: any) {
      setLeadErr(err?.message || "Failed to submit request");
    } finally {
      setLeadBusy(false);
    }
  };

  const whatsappHref = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
    leadMsg || "Hello Ibemhal IAS Helpdesk, I would like course & admission assistance."
  )}`;

  const openDepartmentForm = (dept: "sales" | "support" | "coaching", presetMsg: string) => {
    setDepartment(dept);
    setLeadMsg(presetMsg);
    setLeadDone(null);
    setTab("callback");
  };

  return (
    <>
      {/* Clean single compact floating pill (bottom-right above mobile tab bar) */}
      <div className="fixed bottom-20 right-3 z-[92] flex items-center gap-2 md:bottom-5 md:right-5">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp Ibemhal IAS"
          title="WhatsApp Support"
          className="grid h-11 w-11 place-items-center rounded-full bg-green-600 text-white shadow-lg ring-2 ring-white transition hover:bg-green-700 active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
        <button
          type="button"
          onClick={() => openWidget("quick", true)}
          aria-label="Open AI Concierge and Support"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#14256f] px-4 text-xs font-black text-white shadow-xl ring-2 ring-white transition hover:bg-[#1d348f] active:scale-95"
        >
          <Headphones className="h-4 w-4 text-[#f3d18b]" />
          <span className="hidden sm:inline">AI Help & Contact</span>
          <span className="sm:hidden">Help & AI</span>
        </button>
      </div>

      {/* Interactive Concierge Sheet / Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-end bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:justify-end sm:p-4"
          onClick={() => {
            stopVoice();
            setOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#e5dfd4] bg-[#faf8f4] shadow-2xl sm:max-w-[460px] sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14256f] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-[#f3d18b]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-wide">
                    Ibemhal IAS · AI Concierge & Helpdesk
                  </h2>
                  <p className="text-[11px] font-medium text-blue-200">
                    Voice Assist · Course Advisor · Imphal Centres
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopVoice();
                  setOpen(false);
                }}
                aria-label="Close AI Concierge"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Admin-Controlled Automated Voice & Busy Notice Bar */}
            {config.voiceEnabled && (
              <div className="border-b border-[#e5dfd4] bg-amber-50/90 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] leading-snug text-amber-950">
                    <span className="font-black uppercase tracking-wider text-[#b45309]">
                      Automated Voice Assistant ·{" "}
                    </span>
                    {config.busyNotice}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      speaking
                        ? stopVoice()
                        : speakText(
                            config.voiceGreeting,
                            config.resolvedAudioUrl || config.audioUrl || null
                          )
                    }
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black shadow-sm transition ${
                      speaking
                        ? "bg-red-600 text-white"
                        : "bg-[#14256f] text-white hover:bg-[#1d348f]"
                    }`}
                  >
                    {voiceLoading ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5 animate-pulse" /> Loading...
                      </>
                    ) : speaking ? (
                      <>
                        <VolumeX className="h-3.5 w-3.5" /> Mute
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5" /> Play Voice
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="grid grid-cols-3 border-b border-[#e5dfd4] bg-white p-1.5 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => setTab("quick")}
                className={`rounded-xl py-2 transition ${
                  tab === "quick"
                    ? "bg-[#14256f] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Contact & Quick
              </button>
              <button
                type="button"
                onClick={() => setTab("ai")}
                className={`inline-flex items-center justify-center gap-1 rounded-xl py-2 transition ${
                  tab === "ai"
                    ? "bg-[#14256f] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> AI Advisor
              </button>
              <button
                type="button"
                onClick={() => setTab("callback")}
                className={`rounded-xl py-2 transition ${
                  tab === "callback"
                    ? "bg-[#14256f] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Message Box
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {tab === "quick" && (
                <>
                  {/* Imphal Centres Card (relocated out of the top blue header bar) */}
                  <div className="rounded-2xl border border-[#e5dfd4] bg-white p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#14256f]">
                      <MapPin className="h-4 w-4 text-[#c37a26]" />
                      Our 3 Imphal Centres (Manipur)
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      {branches.map((b) => (
                        <Link
                          key={b.name}
                          href="/locations"
                          onClick={() => setOpen(false)}
                          className="rounded-xl border border-slate-200 bg-[#faf8f4] px-2.5 py-2 text-center text-[11px] font-bold text-[#14256f] hover:border-[#14256f]"
                        >
                          {b.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Direct Phone & Email */}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#e5dfd4] bg-white p-3 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Sales & Helpline Number
                      </div>
                      <a
                        href={`tel:${config.salesPhone.replace(/\s+/g, "")}`}
                        className="mt-1 flex items-center gap-1.5 text-sm font-black text-[#14256f] hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 text-green-600" />
                        {config.salesPhone}
                      </a>
                      <button
                        type="button"
                        onClick={() => void copyValue("phone", config.salesPhone)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#14256f]"
                      >
                        {copiedField === "phone" ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedField === "phone" ? "Copied!" : "Copy number"}
                      </button>
                    </div>

                    <div className="rounded-2xl border border-[#e5dfd4] bg-white p-3 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Official Support Email
                      </div>
                      <a
                        href={`mailto:${config.supportEmail}`}
                        className="mt-1 flex items-center gap-1.5 break-all text-xs font-black text-[#14256f] hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0 text-[#c37a26]" />
                        {config.supportEmail}
                      </a>
                      <button
                        type="button"
                        onClick={() => void copyValue("email", config.supportEmail)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#14256f]"
                      >
                        {copiedField === "email" ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedField === "email" ? "Copied!" : "Copy email"}
                      </button>
                    </div>
                  </div>

                  {/* Premade Quick Concierge Prompts */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Premade Quick Options
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openDepartmentForm(
                          "sales",
                          "Please have an Admissions / Sales counsellor call me regarding batch schedules and fees."
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-[#e5dfd4] bg-white px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 transition hover:border-[#14256f] hover:bg-blue-50/40"
                    >
                      <span>Speak to Sales / Admissions Counsellor</span>
                      <ArrowRight className="h-4 w-4 text-[#14256f]" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openDepartmentForm(
                          "support",
                          "I need Customer Support regarding my student portal login, PDF access, or fee receipt."
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-[#e5dfd4] bg-white px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 transition hover:border-[#14256f] hover:bg-blue-50/40"
                    >
                      <span>Contact Customer Service / Support Desk</span>
                      <ArrowRight className="h-4 w-4 text-[#14256f]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTab("ai");
                        void askAi("Recommend the best UPSC / Banking / SSC course for me");
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-left text-xs font-bold text-[#14256f] transition hover:bg-amber-100/70"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#c37a26]" />
                        Let AI Recommend a Course & Fee Plan
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#14256f]" />
                    </button>

                    <Link
                      href="/courses"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center justify-between rounded-xl bg-[#14256f] px-3.5 py-3 text-xs font-black text-white shadow hover:bg-[#1d348f]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-[#f3d18b]" />
                        Pay Course Fees (UPI QR) & Get Instant Receipt
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-3.5 py-2.5 text-xs font-black text-white hover:bg-green-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat Directly on WhatsApp
                    </a>
                  </div>
                </>
              )}

              {tab === "ai" && (
                <div className="flex h-full flex-col space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Best UPSC IAS batch?",
                      "Banking or SSC fees?",
                      "How do I pay & get receipt?",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => void askAi(chip)}
                        className="rounded-full border border-[#e5dfd4] bg-white px-2.5 py-1 text-[11px] font-bold text-[#14256f] hover:bg-blue-50"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 space-y-2.5 rounded-2xl border border-[#e5dfd4] bg-white p-3">
                    {chat.map((m, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl p-3 text-xs leading-relaxed ${
                          m.role === "user"
                            ? "ml-8 bg-[#14256f] font-semibold text-white"
                            : "mr-4 border border-slate-100 bg-[#faf8f4] text-slate-800"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{m.text}</div>

                        {m.role === "assistant" && config.voiceEnabled && (
                          <button
                            type="button"
                            onClick={() => speakText(m.text)}
                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-[#14256f] hover:underline"
                          >
                            <Volume2 className="h-3 w-3" /> Read reply aloud
                          </button>
                        )}

                        {m.courses && m.courses.length > 0 && (
                          <div className="mt-2.5 space-y-1.5">
                            {m.courses.map((c) => (
                              <Link
                                key={c.id}
                                href={m.payHref || "/courses"}
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-between rounded-xl border border-[#e5dfd4] bg-white px-3 py-2 text-[11px] font-bold text-[#14256f] hover:border-[#14256f]"
                              >
                                <span className="truncate pr-2">{c.title}</span>
                                <span className="shrink-0 font-black text-emerald-700">
                                  ₹{c.priceInr.toLocaleString("en-IN")} · Pay & Receipt →
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="text-xs font-bold text-slate-500">
                        AI Advisor is finding the best batch for you...
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void askAi(aiInput);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Ask about UPSC, MPSC, Banking, fees..."
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#14256f] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiInput.trim()}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#14256f] px-3.5 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {tab === "callback" && (
                <form onSubmit={submitLead} className="space-y-3 rounded-2xl border border-[#e5dfd4] bg-white p-4">
                  <div className="text-xs font-black text-[#14256f]">
                    Send Message to Sales, Support or Costing/Coaching Desk
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: "sales", label: "Sales" },
                        { id: "support", label: "Support" },
                        { id: "coaching", label: "Counselling" },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDepartment(d.id)}
                        className={`rounded-xl border py-1.5 text-[11px] font-black transition ${
                          department === d.id
                            ? "border-[#14256f] bg-[#14256f] text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  <input
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Your Full Name *"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="Phone / WhatsApp *"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={leadMsg}
                    onChange={(e) => setLeadMsg(e.target.value)}
                    placeholder="How can our team help you?"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />

                  {leadErr && (
                    <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                      {leadErr}
                    </div>
                  )}
                  {leadDone && (
                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                      {leadDone}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={leadBusy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#14256f] py-2.5 text-xs font-black text-white hover:bg-[#1d348f] disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {leadBusy ? "Sending..." : "Submit Callback / Inquiry"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
