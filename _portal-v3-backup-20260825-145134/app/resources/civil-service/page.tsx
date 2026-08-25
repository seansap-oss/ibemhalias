import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { BookOpen, FileCheck2, FileQuestion, FolderOpen } from "lucide-react";

const sections = [
  { icon: BookOpen, title: "NCERT Free Books", note: "Free NCERT resource library." },
  { icon: FileQuestion, title: "Prelims - PYQs + Solutions", note: "Previous-year prelims questions and solutions." },
  { icon: FileCheck2, title: "Mains - PYQs + Solutions", note: "Mains previous-year questions and solutions." },
  { icon: FolderOpen, title: "Others", note: "Additional Civil Service resources." },
];

export default function CivilServiceResourcesPage() {
  return (
    <PortalPageShell eyebrow="A2 · Civil Service" title="Civil Service Free Resources">
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <button key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md">
            <section.icon className="h-6 w-6 text-indigo-600" />
            <div className="mt-3 text-lg font-black text-slate-950">{section.title}</div>
            <div className="mt-1 text-sm text-slate-500">{section.note}</div>
          </button>
        ))}
      </div>
    </PortalPageShell>
  );
}
