import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { Building2, Eye, Flag, MessageSquareQuote, Sparkles } from "lucide-react";

const sections = [
  { icon: Flag, title: "About Ibemhal IAS", text: "A dedicated section for the institute profile and background." },
  { icon: Sparkles, title: "Our Mission", text: "The institute mission and academic purpose." },
  { icon: Eye, title: "Our Vision", text: "The long-term vision for student preparation and success." },
  { icon: MessageSquareQuote, title: "Message from Director", text: "A dedicated message from the institute director." },
];

export default function AboutPage() {
  return (
    <PortalPageShell
      eyebrow="A1"
      title="About Us"
      description="Institute profile, mission, vision, leadership message and branch information."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <div className="rounded-[26px] bg-gradient-to-b from-[#14256f] to-[#0e2467] p-6 text-white">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">Ibemhal IAS</div>
          <h2 className="mt-3 text-3xl font-black">A low-fee Institute</h2>
          <p className="mt-4 text-sm leading-relaxed text-blue-100">
            This page is reserved for the institute&apos;s official profile and client-approved copy.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/10 p-4">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-bold">Three branch locations</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <section.icon className="h-6 w-6 text-indigo-600" />
              <h3 className="mt-4 text-lg font-black text-slate-950">{section.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.text}</p>
            </article>
          ))}
        </div>
      </div>
    </PortalPageShell>
  );
}

