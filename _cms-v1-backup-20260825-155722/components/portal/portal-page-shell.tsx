import type { ReactNode } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PortalSidebar } from "./portal-sidebar";
import { WhatsNew } from "./whats-new";
import { PortalFloatingControls } from "./portal-floating-controls";

type PortalPageShellProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
};

export function PortalPageShell({
  title,
  eyebrow,
  description,
  children,
}: PortalPageShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef3ff_0,_#ffffff_40%,_#ffffff_100%)]">
      <Navbar />

      <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="flex items-start gap-4">
          <PortalSidebar />
          <WhatsNew />

          <section className="min-w-0 flex-1 overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 shadow-xl shadow-slate-200/50">
            <header className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-r from-[#f8faff] via-white to-[#f5f7ff] p-6 md:p-8">
              <div className="absolute right-[-80px] top-[-90px] h-56 w-56 rounded-full bg-indigo-100/60 blur-3xl" />

              <div className="relative">
                {eyebrow && (
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
                    {eyebrow}
                  </div>
                )}

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {title}
                </h1>

                {description && (
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
                    {description}
                  </p>
                )}
              </div>
            </header>

            <div className="p-5 md:p-8">{children}</div>
          </section>
        </div>
      </div>

      <Footer />
      <PortalFloatingControls />
    </main>
  );
}
