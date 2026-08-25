import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { Building2, Eye, Flag, Quote, Users } from "lucide-react";

const items = [
  { icon: Flag, title: "Our Mission", text: "Affordable, structured preparation with consistent academic guidance." },
  { icon: Eye, title: "Our Vision", text: "Help aspirants prepare with clarity, discipline and access to quality resources." },
  { icon: Users, title: "Why Choose Us", text: "Focused mentorship, current affairs, resources, mock tests and student support." },
  { icon: Quote, title: "Director's Message", text: "A dedicated space for the institute director's message and guidance." },
];

export default function AboutPage() {
  return (
    <PortalPageShell
      eyebrow="A1"
      title="About Us"
      description="Institute information, mission, vision, leadership message and campus overview."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <item.icon className="h-6 w-6 text-indigo-600" />
            <h2 className="mt-4 text-lg font-black text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-indigo-600" />
          <h2 className="text-lg font-black text-slate-950">Campus & Branches</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Branch information and maps are available in the footer on every page.
        </p>
      </div>
    </PortalPageShell>
  );
}
