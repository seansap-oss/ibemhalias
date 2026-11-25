import { LandingStudioManager } from "@/components/admin/landing-studio-manager";

export default function AdminContentPage() {
  return (
    <div className="min-h-screen bg-[#faf8f4] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#b4691e]">
            IBEMHAL IAS Admin
          </div>
          <h1 className="mt-1 text-3xl font-black text-[#14256f]">
            Landing Page &amp; Content Studio
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
            Manage Hero photos &amp; videos, configure the Homepage discount/announcement
            popup, upload PDFs to the 10-Year Free Archive (2016–2026), and publish
            study materials.
          </p>
        </div>

        <LandingStudioManager />
      </div>
    </div>
  );
}
