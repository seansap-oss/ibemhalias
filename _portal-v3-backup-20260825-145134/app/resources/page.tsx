import Link from "next/link";
import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { ArrowRight, BookOpen, Landmark } from "lucide-react";

export default function ResourcesPage() {
  return (
    <PortalPageShell
      eyebrow="A2"
      title="Free Resources"
      description="Choose Civil Service or SSC & Banking resources."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Link href="/resources/civil-service" className="group rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-6 transition hover:border-indigo-300">
          <Landmark className="h-7 w-7 text-indigo-600" />
          <h2 className="mt-4 text-2xl font-black text-slate-950">Civil Service</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            NCERT Free Books, Prelims PYQs + Solutions, Mains PYQs + Solutions and Others.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-indigo-700">
            Open Resources <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link href="/resources/ssc-banking" className="group rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 transition hover:border-blue-300">
          <BookOpen className="h-7 w-7 text-blue-600" />
          <h2 className="mt-4 text-2xl font-black text-slate-950">SSC & Banking</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Previous year questions and other free exam resources.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700">
            Open Resources <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </PortalPageShell>
  );
}
