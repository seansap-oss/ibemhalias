"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Play,
  RotateCcw,
  Search,
  Timer,
  Trophy,
} from "lucide-react";

type AnyRow = Record<string, any>;

export function StudentDashboardMockTests() {
  const [tests, setTests] = React.useState<AnyRow[]>([]);
  const [summary, setSummary] = React.useState({
    attempted: 0,
    averageScore: 0,
    bestScore: 0,
    totalSeconds: 0,
  });
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [testsResponse, summaryResponse] = await Promise.all([
        fetch("/api/mock-tests", { cache: "no-store" }),
        fetch("/api/mock-tests/summary", { cache: "no-store" }),
      ]);

      const testsData = await testsResponse.json();
      const summaryData = summaryResponse.ok ? await summaryResponse.json() : {};

      if (!testsResponse.ok) throw new Error(testsData.error || "Unable to load Mock Tests.");

      setTests(testsData.tests ?? []);
      setSummary((current) => ({ ...current, ...summaryData }));
    } catch (err: any) {
      setError(err?.message || "Unable to load Mock Tests.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const chips = ["All", "UPSC CSE", "State PCS", "SSC", "Banking", "Other Exams"];

  const filtered = tests.filter((test) => {
    const haystack = `${test.title} ${test.exam_category || ""} ${test.subject || ""}`.toLowerCase();
    const exam = String(test.exam_category || "").toLowerCase();

    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter =
      filter === "All" ||
      (filter === "UPSC CSE" && exam.includes("upsc")) ||
      (filter === "State PCS" && (exam.includes("pcs") || exam.includes("state"))) ||
      (filter === "SSC" && exam.includes("ssc")) ||
      (filter === "Banking" && exam.includes("bank")) ||
      (filter === "Other Exams" && !["upsc", "pcs", "state", "ssc", "bank"].some((key) => exam.includes(key)));

    return matchesSearch && matchesFilter;
  });

  const hours = Math.floor(Number(summary.totalSeconds || 0) / 3600);
  const minutes = Math.floor((Number(summary.totalSeconds || 0) % 3600) / 60);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading your Mock Tests…</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <div className="font-black text-red-800">Unable to load Mock Tests</div>
        <div className="mt-2 text-sm text-red-700">{error}</div>
        <button onClick={load} className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FileCheck2} label="Tests Attempted" value={summary.attempted} />
        <Stat icon={Award} label="Average Score" value={`${Math.round(Number(summary.averageScore || 0))}%`} />
        <Stat icon={Trophy} label="Best Score" value={`${Math.round(Number(summary.bestScore || 0))}%`} />
        <Stat icon={Clock3} label="Total Time" value={`${hours}h ${minutes}m`} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Available Mock Tests</h2>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              Free tests appear automatically. Student-specific tests appear when assigned to your account.
            </p>
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 lg:w-72">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tests…"
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => setFilter(chip)}
              className={[
                "rounded-lg border px-3 py-2 text-[10px] font-black transition",
                filter === chip
                  ? "border-[#174699] bg-[#174699] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-[#174699]",
              ].join(" ")}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#174699]">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div className="mt-3 text-sm font-black text-slate-900">No Mock Tests available yet</div>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Published free tests and tests assigned to your account will appear here automatically.
              </p>
            </div>
          ) : (
            filtered.map((test) => <TestRow key={test.id} test={test} />)
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
      <div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
      <div className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#174699]">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function TestRow({ test }: { test: AnyRow }) {
  const completed = Boolean(test.last_attempt_id);
  const inProgress = Boolean(test.in_progress_attempt_id);
  const locked = Boolean(test.upcoming || test.expired);

  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-md md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#14256f] to-[#2459c5] font-serif text-xl font-black text-amber-300">
        Ib
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className={test.access_label === "ASSIGNED"
            ? "rounded-md bg-violet-100 px-2 py-1 text-[8px] font-black uppercase text-violet-700"
            : "rounded-md bg-green-100 px-2 py-1 text-[8px] font-black uppercase text-green-700"}>
            {test.access_label || "FREE"}
          </span>

          {test.exam_category ? <span className="rounded-md bg-blue-50 px-2 py-1 text-[8px] font-black text-[#174699]">{test.exam_category}</span> : null}
          {test.subject ? <span className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-black text-slate-600">{test.subject}</span> : null}
          {completed ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-700">COMPLETED</span> : null}
          {inProgress ? <span className="rounded-md bg-amber-50 px-2 py-1 text-[8px] font-black text-amber-700">IN PROGRESS</span> : null}
        </div>

        <h3 className="mt-2 text-sm font-black text-slate-950">{test.title}</h3>
        {test.description ? <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-relaxed text-slate-500">{test.description}</p> : null}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500">
          <span>{test.question_count || 0} Questions</span>
          <span>{Number(test.total_marks || 0)} Marks</span>
          <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {Number(test.duration_minutes || 0)} Minutes</span>
          <span>{test.language || "English"}</span>
          {completed ? <span className="font-black text-[#174699]">Last Score: {Math.round(Number(test.last_percentage || 0))}%</span> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 md:max-w-40 md:justify-end">
        {locked ? (
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black text-slate-500">
            {test.upcoming ? "Upcoming" : "Expired"}
          </span>
        ) : inProgress ? (
          <Link href={`/mock-test/${test.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#174699] px-4 text-[11px] font-black text-white">
            <Play className="h-4 w-4" /> Resume Test
          </Link>
        ) : (
          <>
            {completed ? (
              <Link href={`/mock-test/result/${test.last_attempt_id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black text-[#174699]">
                <CheckCircle2 className="h-4 w-4" /> View Result
              </Link>
            ) : null}

            {(!completed || test.can_retake) ? (
              <Link href={`/mock-test/${test.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#174699] px-4 text-[11px] font-black text-white">
                {completed ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {completed ? "Retake" : "Start Test"}
              </Link>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
