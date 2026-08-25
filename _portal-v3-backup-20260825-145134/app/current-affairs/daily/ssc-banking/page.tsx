import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CalendarDays, FileText } from "lucide-react";

const categories = ["Daily CA", "Daily General Studies", "Others"];
const dates = ["26 August", "25 August", "24 August", "23 August", "22 August"];

export default function Page() {
  return (
    <PortalPageShell eyebrow="A3 · SSC & Banking" title="SSC & Banking Daily Current Affairs">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button key={category} className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700">
            {category}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {dates.map((date) => (
          <button key={date} className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left shadow-sm transition hover:border-indigo-300">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-black text-slate-900">{date}</span>
            </div>
            <FileText className="h-5 w-5 text-slate-400" />
          </button>
        ))}
      </div>
    </PortalPageShell>
  );
}
