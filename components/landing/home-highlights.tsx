import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarRange,
  FileQuestion,
  GraduationCap,
  Newspaper,
  Sparkles,
} from "lucide-react";

const destinations = [
  {
    icon: GraduationCap,
    title: "Explore Courses",
    description: "Find the right programme for your exam stage and preparation goals.",
    href: "/courses",
    accent: "bg-blue-50 text-blue-700",
  },
  {
    icon: Newspaper,
    title: "Current Affairs",
    description: "Build a consistent daily reading and revision habit.",
    href: "/current-affairs/daily",
    accent: "bg-amber-50 text-amber-700",
  },
  {
    icon: BookOpenCheck,
    title: "Study Resources",
    description: "Open learning material, PYQs and useful preparation resources.",
    href: "/resources",
    accent: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: FileQuestion,
    title: "Mock Tests",
    description: "Practise in an exam-focused environment and review your progress.",
    href: "/mock-test",
    accent: "bg-violet-50 text-violet-700",
  },
];

const journey = [
  {
    number: "01",
    title: "Choose your direction",
    text: "Explore programmes and understand what fits your present stage.",
  },
  {
    number: "02",
    title: "Build a steady routine",
    text: "Bring classes, resources, current affairs and tests into one rhythm.",
  },
  {
    number: "03",
    title: "Review with guidance",
    text: "Use mentorship and performance feedback to keep improving.",
  },
];

export function HomeHighlights() {
  return (
    <section className="home-highlights overflow-hidden bg-[#f7f9fc] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#174699] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Your preparation, connected
            </div>
            <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
              Everything you need to move from planning to practice.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Start with the next useful step. Ibemhal IAS brings learning, revision,
              assessment and guidance together in one familiar place.
            </p>
            <Link
              href="/mentorship"
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#14256f] px-5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 hover:bg-[#0f1d59]"
            >
              Book personal guidance <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {destinations.map(({ icon: Icon, title, description, href, accent }) => (
              <Link
                key={title}
                href={href}
                className="group rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(15,35,75,0.06)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(15,35,75,0.1)] sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${accent}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#174699]" />
                </div>
                <h3 className="mt-7 text-lg font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 overflow-hidden rounded-[28px] border border-[#203676]/15 bg-white shadow-[0_18px_50px_rgba(15,35,75,0.07)] sm:mt-16">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <div className="relative overflow-hidden bg-[#102968] p-7 text-white sm:p-9">
              <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full border-[32px] border-white/[0.04]" />
              <CalendarRange className="relative h-7 w-7 text-amber-300" />
              <div className="relative mt-7 text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                A simple study path
              </div>
              <h3 className="relative mt-3 text-3xl font-black tracking-tight">
                Prepare with clarity, not clutter.
              </h3>
            </div>
            <div className="grid divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              {journey.map((step) => (
                <div key={step.number} className="p-6 sm:p-7">
                  <div className="text-xs font-black tracking-[0.18em] text-amber-600">{step.number}</div>
                  <h4 className="mt-4 font-black text-slate-900">{step.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
