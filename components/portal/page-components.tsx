import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  FolderOpen,
  LockKeyhole,
} from "lucide-react";

export function GoldenGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-5 lg:grid-cols-[1fr_1.618fr] ${className}`}>
      {children}
    </div>
  );
}

export function CategoryCard({
  href,
  title,
  description,
  eyebrow,
}: {
  href: string;
  title: string;
  description?: string;
  eyebrow?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
    >
      {eyebrow && (
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">
          {eyebrow}
        </div>
      )}
      <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{title}</h3>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      )}
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-indigo-700">
        Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function ResourceTile({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[126px] items-center justify-between rounded-[24px] border border-slate-200 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm transition hover:border-indigo-300"
    >
      <div>
        <BookOpen className="h-6 w-6 text-indigo-600" />
        <h3 className="mt-3 text-lg font-black text-slate-950">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-indigo-600" />
    </Link>
  );
}

export function DateRow({
  date,
  href,
}: {
  date: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition hover:border-indigo-300"
    >
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-indigo-600" />
        <span className="text-sm font-black text-slate-900">{date}</span>
      </div>
      <FileText className="h-5 w-5 text-slate-400" />
    </Link>
  );
}

export function EmptyLibrary({
  title = "No materials published yet",
  description = "New files can be added from the admin panel when they are ready.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
      <FolderOpen className="mx-auto h-8 w-8 text-indigo-500" />
      <h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

export function ProtectedAccess({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-indigo-600 shadow">
        <LockKeyhole className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      <Link
        href="/login"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-200"
      >
        Registration / Login
      </Link>
    </div>
  );
}
