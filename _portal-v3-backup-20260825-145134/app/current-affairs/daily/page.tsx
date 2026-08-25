import Link from "next/link";
import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { ArrowRight, Landmark, Newspaper } from "lucide-react";

export default function DailyCurrentAffairsPage() {
  return (
    <PortalPageShell
      eyebrow="A3"
      title="Daily Current Affairs"
      description="Choose the exam stream to access date-based daily current affairs."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { href: "/current-affairs/daily/civil-service", icon: Landmark, title: "Civil Service", note: "Editorial Analysis, News Analysis and Others." },
          { href: "/current-affairs/daily/ssc-banking", icon: Newspaper, title: "SSC & Banking", note: "Daily CA, Daily General Studies and Others." },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300">
            <item.icon className="h-7 w-7 text-indigo-600" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.note}</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-indigo-700">
              Open Daily Feed <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </PortalPageShell>
  );
}
