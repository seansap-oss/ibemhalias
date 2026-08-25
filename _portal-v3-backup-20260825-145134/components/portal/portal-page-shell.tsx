import type { ReactNode } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PortalSidebar } from "./portal-sidebar";
import { WhatsNew } from "./whats-new";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef3ff_0,_#ffffff_38%,_#ffffff_100%)]">
      <Navbar />
      <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="flex items-start gap-4">
          <PortalSidebar />
          <WhatsNew />

          <section className="min-w-0 flex-1 rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/45 backdrop-blur md:p-8">
            <div className="border-b border-slate-100 pb-6">
              {eyebrow && (
                <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
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

            <div className="pt-6">{children}</div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
