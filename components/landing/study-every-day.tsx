import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Newspaper } from "lucide-react";

const studyCards = [
  {
    icon: Newspaper,
    title: "Daily current affairs",
    body: "Concise, exam-relevant updates on national, international and key topics.",
    href: "/current-affairs/daily",
    image:
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    icon: FileText,
    title: "Previous year papers",
    body: "Access past years' question papers for focused and effective practice.",
    href: "/resources/civil-service/prelims-pyqs-solutions",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    icon: BookOpen,
    title: "Free study resources",
    body: "Curated notes, topic-wise materials and useful prep tools.",
    href: "/resources",
    image:
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80",
  },
];

export function StudyEveryDay() {
  return (
    <section className="border-t border-[#e8e1d5] bg-[#faf8f4] py-12 sm:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#14256f] sm:text-3xl">
            Study every day
          </h2>
          <span className="hidden h-[2px] w-14 bg-[#c37a26] sm:inline-block" />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Stay consistent with quality content, practice material and
          exam-focused resources.
        </p>

        <div className="mt-7 grid gap-6 md:grid-cols-3">
          {studyCards.map(({ icon: Icon, title, body, href, image }) => (
            <Link
              key={title}
              href={href}
              className="group overflow-hidden rounded-2xl border border-[#e5dfd4] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#14256f]/40 hover:shadow-lg"
            >
              <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                <img
                  src={image}
                  alt={title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex items-start gap-3.5 p-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#14256f]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-[#14256f]">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {body}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#14256f] transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
