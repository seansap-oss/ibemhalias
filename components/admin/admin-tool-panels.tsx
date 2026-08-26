"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  GraduationCap,
  Mail,
  MessageCircle,
  Phone,
  Radio,
  Send,
  TestTube2,
  UserRound,
  Users,
} from "lucide-react";
import { SITE_CONTACT, SITE_WHATSAPP_HREF } from "@/lib/site-contact";

function ToolPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#174699]">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-slate-950">{title}</h1>
        <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">{children}</div>;
}

function ActionLink({ href, label, icon: Icon, external = false }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; external?: boolean }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#174699] px-4 text-xs font-black text-white transition hover:bg-[#103a84]">
      <Icon className="h-4 w-4" /> {label}
      {external ? <ExternalLink className="h-3.5 w-3.5" /> : null}
    </Link>
  );
}

export function MockTestAdminPanel() {
  return (
    <ToolPage eyebrow="D3" title="Mock Test" description="Client-approved Mock Test entry point. Keep question/test management here while the student-facing mock test remains available for preview.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><TestTube2 className="h-5 w-5 text-violet-600" /><h2 className="mt-4 text-sm font-black">Student Mock Test Preview</h2><p className="mt-2 text-xs text-slate-500">Open the current mock-test experience exactly as students see it.</p><div className="mt-4"><ActionLink href="/mock-test" label="Open Mock Test" icon={ExternalLink} external /></div></Card>
        <Card><BookOpen className="h-5 w-5 text-blue-600" /><h2 className="mt-4 text-sm font-black">Question / Study Content</h2><p className="mt-2 text-xs text-slate-500">Use Website Content for managed learning files and supporting material.</p><div className="mt-4"><ActionLink href="/admin/content" label="Website Content" icon={BookOpen} /></div></Card>
        <Card><GraduationCap className="h-5 w-5 text-green-600" /><h2 className="mt-4 text-sm font-black">Course Mapping</h2><p className="mt-2 text-xs text-slate-500">Keep tests aligned to the correct course catalogue.</p><div className="mt-4"><ActionLink href="/admin/courses" label="Manage Courses" icon={GraduationCap} /></div></Card>
      </div>
    </ToolPage>
  );
}

export function MentorshipAdminPanel() {
  return (
    <ToolPage eyebrow="D4 / E3" title="Mentorship / Counselling Slot Booking" description="Admin access point for the client-approved booking workflow. The public booking experience stays unchanged while the admin gains direct operational links.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CalendarDays className="h-5 w-5 text-teal-600" /><h2 className="mt-4 text-sm font-black">Booking Page</h2><p className="mt-2 text-xs text-slate-500">Open the student booking page to verify available mentorship and counselling slots.</p><div className="mt-4"><ActionLink href="/mentorship" label="Open Booking Page" icon={CalendarDays} external /></div></Card>
        <Card><Bell className="h-5 w-5 text-rose-600" /><h2 className="mt-4 text-sm font-black">Booking Notifications</h2><p className="mt-2 text-xs text-slate-500">Prepare announcements or reminders from the Notification Center.</p><div className="mt-4"><ActionLink href="/admin/notifications" label="Notification Center" icon={Bell} /></div></Card>
        <Card><Users className="h-5 w-5 text-blue-600" /><h2 className="mt-4 text-sm font-black">Student Records</h2><p className="mt-2 text-xs text-slate-500">Check the student identity, phone number and class access records.</p><div className="mt-4"><ActionLink href="/admin/live-classes/students" label="Student Access" icon={Users} /></div></Card>
      </div>
    </ToolPage>
  );
}

export function StudentSpaceAdminPanel() {
  return (
    <ToolPage eyebrow="D5" title="Student Space" description="Admin shortcut to the student experience and the identity/access records that control what each Student ID is allowed to see.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><GraduationCap className="h-5 w-5 text-blue-600" /><h2 className="mt-4 text-sm font-black">Student Space Preview</h2><p className="mt-2 text-xs text-slate-500">Open the student-facing area in a new tab for visual and navigation testing.</p><div className="mt-4"><ActionLink href="/student-space" label="Open Student Space" icon={ExternalLink} external /></div></Card>
        <Card><UserRound className="h-5 w-5 text-green-600" /><h2 className="mt-4 text-sm font-black">Student Identity & Access</h2><p className="mt-2 text-xs text-slate-500">Manage unique Student IDs, phone numbers, packages and multiple assigned live classes.</p><div className="mt-4"><ActionLink href="/admin/live-classes/students" label="Manage Students" icon={Users} /></div></Card>
      </div>
    </ToolPage>
  );
}

export function NotificationAdminPanel() {
  const [recipient, setRecipient] = React.useState("All Students");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [preview, setPreview] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const combined = `${title ? `${title}\n\n` : ""}${message}`.trim();
  const testWhatsapp = `https://wa.me/${SITE_CONTACT.whatsappNumber}?text=${encodeURIComponent(combined || "Ibemhal IAS test notification")}`;

  const copy = async () => {
    if (!combined) return;
    try {
      await navigator.clipboard.writeText(combined);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ToolPage eyebrow="E2" title="Send Notification" description="Client-approved notification composer. This page is test-safe now; production bulk delivery remains connected to the live-class reminder/WhatsApp provider configuration.">
      <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <Card>
          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-600">Send To
              <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#174699]">
                <option>All Students</option><option>Assigned Live Class Students</option><option>Test Admin Only</option>
              </select>
            </label>
            <label className="block text-xs font-black text-slate-600">Notification Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Class reminder / announcement" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#174699]" />
            </label>
            <label className="block text-xs font-black text-slate-600">Notification Message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Write your notification message…" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#174699]" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPreview(true)} disabled={!combined} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#174699] px-4 text-xs font-black text-white disabled:opacity-40"><Send className="h-4 w-4" /> Preview</button>
              <button type="button" onClick={copy} disabled={!combined} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700 disabled:opacity-40"><Clipboard className="h-4 w-4" /> {copied ? "Copied" : "Copy Message"}</button>
              <a href={testWhatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 text-xs font-black text-green-700"><MessageCircle className="h-4 w-4" /> WhatsApp Test</a>
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-black text-[#174699]">Message Preview</h2>
            <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-xs">
              <div className="font-black text-slate-700">To: {recipient}</div>
              <div className="mt-3 font-black text-slate-950">{preview && title ? title : "Notification title"}</div>
              <div className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-500">{preview && message ? message : "Your notification preview will appear here."}</div>
            </div>
          </Card>
          <Card>
            <h2 className="text-sm font-black text-[#174699]">Automation</h2>
            <p className="mt-2 text-xs text-slate-500">Live-class 1-day, 1-hour and short-notice reminders are managed in the existing reminder automation panel.</p>
            <div className="mt-4"><ActionLink href="/admin/live-classes/reminders" label="Reminder Automation" icon={Bell} /></div>
          </Card>
        </div>
      </div>
    </ToolPage>
  );
}

export function HelpDeskAdminPanel() {
  return (
    <ToolPage eyebrow="E6" title="Help Desk Mail" description="Direct help-desk communication using the approved Ibemhal IAS contact details.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><Mail className="h-5 w-5 text-blue-600" /><h2 className="mt-4 text-sm font-black">Email Help Desk</h2><p className="mt-2 break-all text-xs font-bold text-slate-600">{SITE_CONTACT.helpdeskEmail}</p><a href={`mailto:${SITE_CONTACT.helpdeskEmail}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#174699] px-4 text-xs font-black text-white"><Mail className="h-4 w-4" /> Send Mail</a></Card>
        <Card><Phone className="h-5 w-5 text-slate-700" /><h2 className="mt-4 text-sm font-black">Call</h2><p className="mt-2 text-xs font-bold text-slate-600">{SITE_CONTACT.phoneDisplay}</p><a href={`tel:${SITE_CONTACT.phoneE164}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700"><Phone className="h-4 w-4" /> Call Help Desk</a></Card>
        <Card><MessageCircle className="h-5 w-5 text-green-600" /><h2 className="mt-4 text-sm font-black">WhatsApp</h2><p className="mt-2 text-xs font-bold text-slate-600">{SITE_CONTACT.phoneDisplay}</p><a href={SITE_WHATSAPP_HREF} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-green-600 px-4 text-xs font-black text-white"><MessageCircle className="h-4 w-4" /> Open WhatsApp</a></Card>
      </div>
    </ToolPage>
  );
}

export function AdminProfilePanel() {
  const [email, setEmail] = React.useState("Loading…");
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        setOk(response.ok && data?.authenticated === true);
        setEmail(data?.email || "Admin");
      })
      .catch(() => {
        setEmail("Session unavailable");
        setOk(false);
      });
  }, []);

  return (
    <ToolPage eyebrow="ADMIN" title="Admin Profile" description="Current administrator session and testing status.">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Session Email</div><div className="mt-2 break-all text-sm font-black text-slate-900">{email}</div></div>
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Session Status</div><div className={`mt-2 inline-flex items-center gap-2 text-sm font-black ${ok ? "text-green-600" : "text-amber-600"}`}><CheckCircle2 className="h-4 w-4" /> {ok ? "Authenticated" : "Check login"}</div></div>
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Class Tools</div><Link href="/admin/live-classes" className="mt-2 inline-flex items-center gap-2 text-sm font-black text-[#174699]"><Radio className="h-4 w-4" /> Open Manager</Link></div>
        </div>
      </Card>
    </ToolPage>
  );
}
