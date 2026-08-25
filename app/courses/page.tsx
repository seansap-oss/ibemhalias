import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { BookOpen } from "lucide-react";

export default function Page() {
  return (
    <PortalPageShell title="COURSES" description="Course cards will be managed from the admin panel.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <article key={index} className="aspect-[4/5] rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50 p-5 shadow-sm">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <div className="mt-auto flex h-full items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-black text-slate-900">COURSES</div>
                <div className="mt-1 text-xs text-slate-500">Course slot {index + 1}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PortalPageShell>
  );
}
