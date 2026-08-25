import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { branchLocations } from "@/components/portal/nav-items";
import { Mail, MapPin } from "lucide-react";

export default function Page() {
  return (
    <PortalPageShell title="CONTACT DETAILS">
      <div className="grid gap-5 md:grid-cols-3">
        {branchLocations.map((branch) => (
          <article key={branch.name} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <iframe
              title={`${branch.name} map`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(branch.mapQuery)}&output=embed`}
              className="h-56 w-full border-0"
              loading="lazy"
            />
            <div className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-600" />
                <h2 className="font-black text-slate-950">LOCATION FOR {branch.name.toUpperCase()}</h2>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Mail className="h-5 w-5 text-indigo-600" />
          Studenthelpdesk@.....com
        </div>
      </div>
    </PortalPageShell>
  );
}
