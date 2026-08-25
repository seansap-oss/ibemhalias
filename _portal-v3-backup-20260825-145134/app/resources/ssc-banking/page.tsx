import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { FileQuestion, FolderOpen } from "lucide-react";

export default function SSCBankingResourcesPage() {
  return (
    <PortalPageShell eyebrow="A2 · SSC & Banking" title="SSC & Banking Free Resources">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: FileQuestion, title: "PYQs", note: "Previous-year questions." },
          { icon: FolderOpen, title: "Others", note: "Additional SSC & Banking resources." },
        ].map((section) => (
          <button key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300">
            <section.icon className="h-6 w-6 text-indigo-600" />
            <div className="mt-3 text-lg font-black text-slate-950">{section.title}</div>
            <div className="mt-1 text-sm text-slate-500">{section.note}</div>
          </button>
        ))}
      </div>
    </PortalPageShell>
  );
}
