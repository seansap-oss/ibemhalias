import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FileText,
  PlayCircle,
  Radio,
} from "lucide-react";

const actions = [
  { icon: CalendarDays, label: "Join upcoming class" },
  { icon: Clock3, label: "View schedule" },
  { icon: FileText, label: "Open resources" },
  { icon: PlayCircle, label: "Watch replay" },
];

export function LiveClassPromo() {
  return (
    <section className="live-class-promo bg-[#f7f9fc] px-4 pb-16 pt-2 sm:px-6 sm:pb-20 lg:px-8">
      <div className="live-class-promo-card relative mx-auto max-w-[1500px] overflow-hidden rounded-[30px] bg-[#102968] text-white shadow-[0_24px_60px_rgba(16,41,104,0.2)]">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border-[54px] border-white/[0.04]" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.08fr_.92fr] lg:p-10">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em]">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" />
              Live Now <span className="normal-case tracking-normal text-white/65">Interactive teleclasses</span>
            </div>
            <h2 className="max-w-xl text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              Your classroom, wherever you are.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
              Your purchased package automatically decides which live classes appear
              under your permanent Student ID.
            </p>
            <Link
              href="/live-classes"
              className="mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#14256f] transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              Open Live Classes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {actions.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="group flex min-h-36 flex-col justify-between rounded-[22px] border border-white/10 bg-white/[0.075] p-5 backdrop-blur-sm transition hover:bg-white/[0.12]"
              >
                <Icon className="h-5 w-5 text-blue-200 transition group-hover:text-amber-300" />
                <p className="text-sm font-black">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-3 border-t border-white/10 px-6 py-4 text-xs font-semibold text-white/65 sm:px-10">
          <Radio className="h-4 w-4 shrink-0 text-red-400" />
          Live access, PDFs, reminders and replays follow the same Student ID.
        </div>
      </div>
    </section>
  );
}
