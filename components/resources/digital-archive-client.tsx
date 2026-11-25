"use client";

import * as React from "react";
import {
  Archive,
  Calendar,
  Download,
  FileText,
  Search,
} from "lucide-react";

const ARCHIVE_YEARS = [
  2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ArchiveDoc = {
  id: string;
  title: string;
  year: number;
  month: string;
  category: string;
  url: string;
};

export function DigitalArchiveClient() {
  const [docs, setDocs] = React.useState<ArchiveDoc[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [year, setYear] = React.useState<number | "ALL">("ALL");
  const [month, setMonth] = React.useState<string>("ALL");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    fetch("/api/cms/content?section=digital_archive", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        const parsed: ArchiveDoc[] = (data.items || [])
          .map((item: any) => {
            let meta: any = {};
            try {
              meta = JSON.parse(item.description || "{}");
            } catch {
              meta = {};
            }
            const url = item.media_url || item.external_url || "";
            if (!url) return null;
            return {
              id: item.id,
              title: item.title || "Archived PDF",
              year: Number(meta.year) || 2026,
              month: String(meta.month || "January"),
              category: String(meta.category || "Study Material"),
              url,
            };
          })
          .filter(Boolean);
        setDocs(parsed);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (year !== "ALL" && d.year !== year) return false;
      if (month !== "ALL" && d.month.toLowerCase() !== month.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.month.toLowerCase().includes(q) ||
        String(d.year).includes(q)
      );
    });
  }, [docs, year, month, query]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5dfd4] bg-[#faf8f4] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setYear("ALL")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${
              year === "ALL"
                ? "bg-[#14256f] text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All Years (2016–2026)
          </button>
          {ARCHIVE_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                year === y
                  ? "bg-[#14256f] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-[#e8e1d5] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#14256f]" />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="ALL">All Months</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search archived PDFs..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading 10-year digital archive…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Archive className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-bold text-slate-700">
            No archived PDFs found for this selection yet.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Admins can upload free PDFs for any month from 2016 to 2026 in{" "}
            <b>Admin → Content → 10-Year PDF Archive</b>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col rounded-2xl border border-[#e5dfd4] bg-white p-4 shadow-sm transition hover:border-[#14256f]/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-black">
                <span className="rounded-md bg-[#14256f] px-2.5 py-0.5 text-white">
                  {doc.month} {doc.year}
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-900">
                  {doc.category}
                </span>
              </div>
              <div className="mt-3 flex items-start gap-2.5">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <h3 className="text-sm font-black text-slate-900">{doc.title}</h3>
              </div>
              <div className="mt-auto pt-4">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#14256f] py-2 text-xs font-black text-white hover:bg-[#1d348f]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Open / Download Free PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
