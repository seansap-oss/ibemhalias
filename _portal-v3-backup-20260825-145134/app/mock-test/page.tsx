import Link from "next/link";
import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { LockKeyhole } from "lucide-react";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A7" title="Free Mock Test" description="Login-gated mock tests, results, analysis and performance reports.">
      <div className="mx-auto max-w-xl rounded-3xl border border-indigo-100 bg-indigo-50/60 p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-indigo-600 shadow-sm">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-black text-slate-950">Registration / Login Required</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This area is reserved for registered students.
        </p>
        <Link href="/login" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-black text-white">
          Login / Register
        </Link>
      </div>
    </PortalPageShell>
  );
}
