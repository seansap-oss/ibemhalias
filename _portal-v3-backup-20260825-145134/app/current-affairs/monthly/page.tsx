import Link from "next/link";
import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { ArrowRight, Landmark, Newspaper } from "lucide-react";

export default function MonthlyCurrentAffairsPage() {
  return (
    <PortalPageShell
      eyebrow="A4"
      title="Monthly Current Affairs"
      description="Choose Civil Service or SSC & Banking, then select a month."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { href: "/current-affairs/monthly/civil-service", icon: Landmark, title: "Civil Service" },
          { href: "/current-affairs/monthly/ssc-banking", icon: Newspaper, title: "SSC & Banking" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300">
            <item.icon className="h-7 w-7 text-indigo-600" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">{item.title}</h2>
            <div className="mt-4 flex gap-2">
              {["August", "Sept", "Oct"].map((month) => (
                <span key={month} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">{month}</span>
              ))}
            </div>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-indigo-700">
              Open Archive <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </PortalPageShell>
  );
}
