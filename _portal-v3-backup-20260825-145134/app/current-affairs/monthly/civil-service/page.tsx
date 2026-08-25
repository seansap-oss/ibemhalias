import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CalendarRange, FileText } from "lucide-react";

const months = ["August", "September", "October"];

export default function Page() {
  return (
    <PortalPageShell eyebrow="A4 · Civil Service" title="Civil Service Monthly Current Affairs">
      <div className="grid gap-4 sm:grid-cols-3">
        {months.map((month) => (
          <button key={month} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300">
            <CalendarRange className="h-6 w-6 text-indigo-600" />
            <div className="mt-3 text-lg font-black text-slate-950">{month}</div>
            <div className="mt-1 text-sm text-slate-500">Open month archive</div>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
          <FileText className="h-5 w-5 text-indigo-600" />
          Month content will appear here.
        </div>
      </div>
    </PortalPageShell>
  );
}
