import { Mail, MapPin } from "lucide-react";
import { branchLocations } from "@/components/portal/nav-items";

export function Footer() {
  return (
    <footer id="contact" className="border-t border-slate-200 bg-[#0c1f5f] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_.7fr]">
          <div>
            <div className="mb-5">
              <div className="text-2xl font-black">Ibemhal IAS</div>
              <div className="text-xs font-bold text-blue-200">A low-fee Institute</div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {branchLocations.map((branch) => (
                <div key={branch.name} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <iframe
                    title={`${branch.name} branch map`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(branch.mapQuery)}&output=embed`}
                    className="h-40 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="flex items-center gap-2 p-4">
                    <MapPin className="h-4 w-4 text-amber-400" />
                    <div>
                      <div className="text-sm font-black">{branch.name}</div>
                      <div className="text-xs text-blue-200">Imphal, Manipur</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-black">Contact</h3>
            <div className="mt-4 flex items-start gap-3 text-sm text-blue-100">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>Studenthelpdesk@.....com</span>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                Technology Partner
              </div>
              <div className="mt-2 text-base font-black">AviT-Solutions</div>
              <p className="mt-2 text-xs leading-relaxed text-blue-200">
                Created and designed by AviT-Solutions.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-blue-200">
          © 2026 Ibemhal IAS. All rights reserved. · Created and designed by AviT-Solutions.
        </div>
      </div>
    </footer>
  );
}
