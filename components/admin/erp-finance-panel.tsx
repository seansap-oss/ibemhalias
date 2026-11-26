"use client";

import * as React from "react";
import {
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  PieChart,
  Plus,
  QrCode as QrIcon,
  Receipt,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  Wallet,
} from "lucide-react";
import { QrCode } from "@/components/ui/qr-code";

interface ForecastData {
  nextPaise: number;
  growthPercent: number;
  confidenceLabel: string;
}

interface ErpSummary {
  online_income_paise: number;
  offline_income_paise: number;
  gross_income_paise: number;
  base_revenue_paise: number;
  gst_percent: number;
  gst_amount_paise: number;
  total_expenses_paise: number;
  net_profit_paise: number;
  erp_fee_bps: number;
  erp_fee_paise: number;
  net_after_erp_fee_paise: number;
  paid_orders_count: number;
  offline_orders_count: number;
  pending_orders_count: number;
  ai_forecast?: {
    weekly: ForecastData;
    monthly: ForecastData;
  };
}

interface PeriodRow {
  period: string;
  online_paise: number;
  offline_paise: number;
  income_paise: number;
  expense_paise: number;
  erp_fee_paise: number;
  orders: number;
}

interface CourseOption {
  id: string;
  title: string;
  slug: string | null;
}

interface CombinedLedgerRow {
  id: string;
  kind: "online" | "offline";
  student_name: string;
  student_email: string;
  student_phone: string;
  course_title: string;
  payment_mode: string;
  amount_paise: number;
  date: string;
  enrolled: boolean;
  reference: string;
}

interface ExpenseRow {
  id: string;
  title: string;
  category: string;
  expense_date: string;
  amount_paise: number;
  notes: string;
}

interface TopSellerRow {
  code: string;
  title: string;
  units: number;
  revenue_paise: number;
}

interface ErpInvoiceRow {
  id: string;
  invoice_number: string;
  billing_cycle: string;
  period_label: string;
  gross_income_paise: number;
  fee_bps: number;
  fee_amount_paise: number;
  status: string;
  payment_ref: string;
  notes: string;
  created_at: string;
}

interface ErpResponse {
  isOwner: boolean;
  ownerUpiId: string | null;
  instituteUpiId: string | null;
  courses: CourseOption[];
  summary: ErpSummary;
  daily: PeriodRow[];
  weekly: PeriodRow[];
  monthly: PeriodRow[];
  yearly: PeriodRow[];
  expenses: ExpenseRow[];
  combinedLedger: CombinedLedgerRow[];
  topSellers: TopSellerRow[];
  erpInvoices: ErpInvoiceRow[];
}

const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

const CATEGORIES = ["Salaries", "Rent & Utilities", "Marketing", "Tech & Servers", "Printing & Notes", "Other"];

export function ErpFinancePanel() {
  const [data, setData] = React.useState<ErpResponse | null>(null);
  const [error, setError] = React.useState("");
  const [statusMsg, setStatusMsg] = React.useState("");
  const [periodTab, setPeriodTab] = React.useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [chartMode, setChartMode] = React.useState<"weekly" | "monthly">("monthly");

  // Offline payment + Auto-Enroll form state
  const [offName, setOffName] = React.useState("");
  const [offEmail, setOffEmail] = React.useState("");
  const [offPhone, setOffPhone] = React.useState("");
  const [offCourseId, setOffCourseId] = React.useState("");
  const [offMode, setOffMode] = React.useState<"cash" | "bank" | "card">("cash");
  const [offAmount, setOffAmount] = React.useState("");
  const [offDate, setOffDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );
  const [offAutoEnroll, setOffAutoEnroll] = React.useState(true);
  const [offNotes, setOffNotes] = React.useState("");

  // Expense form state
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [amountRupees, setAmountRupees] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );
  const [notes, setNotes] = React.useState("");
  const [gstInput, setGstInput] = React.useState("18");

  // Super Admin ERP Invoice generator state
  const [invCycle, setInvCycle] = React.useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [invPeriod, setInvPeriod] = React.useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7)
  );
  const [invGrossRupees, setInvGrossRupees] = React.useState("");
  const [invNotes, setInvNotes] = React.useState("2% ERP Maintenance & Payment Gateway Charge (incl. GST)");
  const [payRefMap, setPayRefMap] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/erp/summary", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to load ERP data.");
      setData(json);
      setGstInput(String(json.summary?.gst_percent ?? 18));
      setInvGrossRupees((prev) =>
        prev === "" ? String(Math.round((json.summary?.gross_income_paise || 0) / 100)) : prev
      );
      if (json.courses?.length && !offCourseId) {
        setOffCourseId(json.courses[0].id);
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load ERP data.");
    }
  }, [offCourseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function addOfflinePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    setStatusMsg("");
    try {
      const selectedCourse = data.courses.find((c) => c.id === offCourseId);
      const res = await fetch("/api/erp/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add_offline_payment",
          student_name: offName,
          student_email: offEmail,
          student_phone: offPhone,
          course_id: offCourseId || null,
          course_title: selectedCourse?.title || "Course",
          payment_mode: offMode,
          amount_rupees: Number(offAmount),
          payment_date: offDate,
          auto_enroll: offAutoEnroll,
          notes: offNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record offline payment.");
      const extra = [
        `Offline ${offMode.toUpperCase()} receipt ${json.receipt_number} saved.`,
        json.enrolled ? "Student enrolled immediately!" : "",
        json.studentCreated && json.tempPassword ? `New student password: ${json.tempPassword}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      setStatusMsg(extra);
      setOffName("");
      setOffEmail("");
      setOffPhone("");
      setOffAmount("");
      setOffNotes("");
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to record offline payment.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteOfflinePayment(id: string) {
    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/erp/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete_offline_payment", id }),
      });
      if (!res.ok) throw new Error("Failed to remove offline payment.");
      setStatusMsg("Offline payment removed.");
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to remove offline payment.");
    } finally {
      setBusy(false);
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/erp/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add_expense",
          title,
          category,
          amount_rupees: Number(amountRupees),
          expense_date: expenseDate,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add expense.");
      setTitle("");
      setAmountRupees("");
      setNotes("");
      setStatusMsg("Expense recorded.");
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to add expense.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteExpense(id: string) {
    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/erp/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete_expense", id }),
      });
      if (!res.ok) throw new Error("Failed to remove expense.");
      setStatusMsg("Expense removed.");
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to remove expense.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTax() {
    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/erp/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update_tax", gst_percent: Number(gstInput) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update tax rate.");
      setStatusMsg(`GST rate updated to ${gstInput}%.`);
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to update tax rate.");
    } finally {
      setBusy(false);
    }
  }

  async function createErpInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/erp/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_erp_invoice",
          billing_cycle: invCycle,
          period_label: invPeriod,
          gross_income_rupees: Number(invGrossRupees || 0),
          fee_bps: data.summary.erp_fee_bps,
          notes: invNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send ERP invoice.");
      setStatusMsg(`Invoice ${json.invoice_number} sent to Coaching Centre / Director.`);
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to send ERP invoice.");
    } finally {
      setBusy(false);
    }
  }

  async function submitInvoicePayment(id: string) {
    const ref = (payRefMap[id] || "").trim();
    if (!ref) return;
    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/erp/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "submit_invoice_payment", id, payment_ref: ref }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit reference.");
      setStatusMsg("Payment reference submitted for Super Admin verification.");
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Unable to submit reference.");
    } finally {
      setBusy(false);
    }
  }

  async function markInvoiceStatus(id: string, status: "paid" | "unpaid") {
    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/erp/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "mark_invoice_status", id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to update invoice.");
      setStatusMsg(`Invoice marked ${status}.`);
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Unable to update invoice.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Loading Silicon Valley ERP Analytics, Offline+Online Income &amp; AI Forecast…
      </section>
    );
  }

  const {
    summary,
    daily,
    weekly,
    monthly,
    yearly,
    expenses,
    combinedLedger,
    topSellers,
    erpInvoices,
    isOwner,
    ownerUpiId,
    instituteUpiId,
    courses,
  } = data;

  const feePercentLabel = (summary.erp_fee_bps / 100).toFixed(2);
  const activePeriods =
    periodTab === "daily" ? daily : periodTab === "weekly" ? weekly : periodTab === "monthly" ? monthly : yearly;

  // Chart series (chronological ascending, max 6 periods + 1 AI Forecast bar)
  const rawSeries = (chartMode === "weekly" ? weekly : monthly).slice(0, 6).reverse();
  const forecast = chartMode === "weekly" ? summary.ai_forecast?.weekly : summary.ai_forecast?.monthly;
  const maxBarVal = Math.max(
    10000,
    ...rawSeries.map((r) => Math.max(r.online_paise, r.offline_paise, r.income_paise)),
    forecast?.nextPaise || 0
  );

  // Donut / Pie chart ratios
  const totalMix = summary.online_income_paise + summary.offline_income_paise + summary.total_expenses_paise;
  const onlinePct = totalMix > 0 ? Math.round((summary.online_income_paise / totalMix) * 100) : 50;
  const offlinePct = totalMix > 0 ? Math.round((summary.offline_income_paise / totalMix) * 100) : 50;
  const expensePct = totalMix > 0 ? Math.max(0, 100 - onlinePct - offlinePct) : 0;

  const activeQrUpi = instituteUpiId || ownerUpiId || "";
  const qrAmountNum = Number(offAmount || 0);
  const qrUri = activeQrUpi
    ? `upi://pay?pa=${encodeURIComponent(activeQrUpi)}&pn=Ibemhal%20IAS${
        qrAmountNum > 0 ? `&am=${qrAmountNum.toFixed(2)}` : ""
      }&cu=INR`
    : "";

  return (
    <div className="space-y-6">
      {/* 5 Vibrant Semantic Color-Coded KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Combined</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-[#14256f]">ALL</span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#14256f]">{inr(summary.gross_income_paise)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.paid_orders_count + summary.offline_orders_count} total admissions
          </p>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Online UPI</p>
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">ONLINE</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{inr(summary.online_income_paise)}</p>
          <p className="mt-1 text-xs text-emerald-800">{summary.paid_orders_count} verified UPI orders</p>
        </div>

        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Offline Cash / Desk</p>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">OFFLINE</span>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-700">{inr(summary.offline_income_paise)}</p>
          <p className="mt-1 text-xs text-blue-800">{summary.offline_orders_count} counter receipts</p>
        </div>

        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Expenses &amp; 2% Fee</p>
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">OUTFLOW</span>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">
            {inr(summary.total_expenses_paise + summary.erp_fee_paise)}
          </p>
          <p className="mt-1 text-xs text-rose-800">
            Exp {inr(summary.total_expenses_paise)} · {feePercentLabel}% Fee {inr(summary.erp_fee_paise)}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-amber-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-900">AI Next-Month Forecast</p>
            <Sparkles className="h-4 w-4 text-violet-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-violet-700">
            {inr(summary.ai_forecast?.monthly.nextPaise || 0)}
          </p>
          <p className="mt-1 text-xs font-semibold text-violet-800">
            {(summary.ai_forecast?.monthly.growthPercent ?? 0) >= 0 ? "+" : ""}
            {summary.ai_forecast?.monthly.growthPercent ?? 0}% · {summary.ai_forecast?.monthly.confidenceLabel}
          </p>
        </div>
      </div>

      {statusMsg && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
          {statusMsg}
        </p>
      )}

      {/* Graphical Analytics Row: Bar + AI Forecast Chart & Revenue Mix Donut/Pie Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Online UPI vs. Offline Cash &amp; AI Forecast
              </h3>
              <p className="text-xs text-slate-500">
                Green = Online UPI · Blue = Offline Cash/Desk · Violet = AI Projected Next Period
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartMode("weekly")}
                className={`rounded-lg px-3 py-1.5 ${
                  chartMode === "weekly" ? "bg-[#14256f] text-white" : "text-slate-600"
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setChartMode("monthly")}
                className={`rounded-lg px-3 py-1.5 ${
                  chartMode === "monthly" ? "bg-[#14256f] text-white" : "text-slate-600"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="mt-5 flex h-56 items-end gap-3 overflow-x-auto rounded-xl bg-[#faf8f4] p-4">
            {rawSeries.length === 0 ? (
              <div className="grid h-full w-full place-items-center text-sm text-slate-500">
                Record online or offline course payments to view chart bars.
              </div>
            ) : (
              <>
                {rawSeries.map((row) => {
                  const onlineH = Math.max(6, Math.round((row.online_paise / maxBarVal) * 140));
                  const offlineH = Math.max(6, Math.round((row.offline_paise / maxBarVal) * 140));
                  return (
                    <div key={row.period} className="flex min-w-[68px] flex-1 flex-col items-center gap-2">
                      <div className="flex h-36 items-end gap-1.5">
                        <div
                          title={`Online UPI: ${inr(row.online_paise)}`}
                          style={{ height: `${onlineH}px` }}
                          className="w-5 rounded-t-md bg-emerald-500 transition-all"
                        />
                        <div
                          title={`Offline Cash: ${inr(row.offline_paise)}`}
                          style={{ height: `${offlineH}px` }}
                          className="w-5 rounded-t-md bg-blue-600 transition-all"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">{row.period}</span>
                    </div>
                  );
                })}
                {/* AI Forecast Projected Bar */}
                <div className="flex min-w-[82px] flex-1 flex-col items-center gap-2 border-l border-dashed border-violet-300 pl-3">
                  <div className="flex h-36 items-end">
                    <div
                      title={`AI Forecast: ${inr(forecast?.nextPaise || 0)}`}
                      style={{
                        height: `${Math.max(10, Math.round(((forecast?.nextPaise || 0) / maxBarVal) * 140))}px`,
                      }}
                      className="w-8 rounded-t-md border-2 border-dashed border-violet-600 bg-violet-500/30"
                    />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-violet-700">
                    <Sparkles className="h-3 w-3" />
                    AI Next
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Revenue Mix & Expenses Donut / Pie Chart */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
            <PieChart className="h-5 w-5 text-blue-600" />
            Revenue &amp; Expense Mix
          </h3>
          <div className="mt-4 flex flex-col items-center gap-4">
            <svg viewBox="0 0 42 42" className="h-40 w-40 -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="6"
                strokeDasharray={`${onlinePct} ${100 - onlinePct}`}
                strokeDashoffset="0"
              />
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#2563eb"
                strokeWidth="6"
                strokeDasharray={`${offlinePct} ${100 - offlinePct}`}
                strokeDashoffset={String(-onlinePct)}
              />
              {expensePct > 0 && (
                <circle
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke="#f43f5e"
                  strokeWidth="6"
                  strokeDasharray={`${expensePct} ${100 - expensePct}`}
                  strokeDashoffset={String(-(onlinePct + offlinePct))}
                />
              )}
            </svg>
            <div className="w-full space-y-2 text-xs font-bold">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-emerald-700">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" /> Online UPI
                </span>
                <span>{onlinePct}% ({inr(summary.online_income_paise)})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-blue-700">
                  <span className="h-3 w-3 rounded-full bg-blue-600" /> Offline Cash / Desk
                </span>
                <span>{offlinePct}% ({inr(summary.offline_income_paise)})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-rose-700">
                  <span className="h-3 w-3 rounded-full bg-rose-500" /> Expenses
                </span>
                <span>{expensePct}% ({inr(summary.total_expenses_paise)})</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Record Offline / Cash Payment & Instant Auto-Enroll + Live Scannable Counter UPI QR */}
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={addOfflinePayment}
          className="space-y-4 rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
                <Banknote className="h-5 w-5 text-blue-600" />
                Record Offline / Cash Payment &amp; Auto-Enroll
              </h3>
              <p className="text-xs text-slate-500">
                Log walk-in Cash, Bank/NEFT, or Card/POS fees. Automatically enrolls the student &amp; updates combined ERP totals.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <input
              required
              value={offName}
              onChange={(e) => setOffName(e.target.value)}
              placeholder="Student Full Name *"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              required
              type="email"
              value={offEmail}
              onChange={(e) => setOffEmail(e.target.value)}
              placeholder="Student Email *"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              value={offPhone}
              onChange={(e) => setOffPhone(e.target.value)}
              placeholder="Phone / WhatsApp"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={offCourseId}
              onChange={(e) => setOffCourseId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="">Select Course to Assign</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={offAmount}
              onChange={(e) => setOffAmount(e.target.value)}
              placeholder="Amount Paid (₹) *"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              required
              type="date"
              value={offDate}
              onChange={(e) => setOffDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-500">Method:</span>
              {([
                ["cash", "Cash"],
                ["bank", "Bank / NEFT"],
                ["card", "Card / POS"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOffMode(mode)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    offMode === mode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">
              <input
                type="checkbox"
                checked={offAutoEnroll}
                onChange={(e) => setOffAutoEnroll(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Auto-Enroll Student Immediately
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              value={offNotes}
              onChange={(e) => setOffNotes(e.target.value)}
              placeholder="Counter receipt notes (optional)"
              className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <button
              disabled={busy}
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Wallet className="h-4 w-4" />
              Save Offline Payment &amp; Enroll
            </button>
          </div>
        </form>

        {/* Live Counter Scannable GPay / UPI QR Code */}
        <section className="flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-200 bg-white p-5 text-center shadow-sm">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase text-emerald-800">
            <QrIcon className="h-3.5 w-3.5" /> Counter / Desk UPI QR
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Scan with GPay, PhonePe, or Paytm {qrAmountNum > 0 ? `for ₹${qrAmountNum}` : "(enter amount on left)"}
          </p>
          {qrUri ? (
            <div className="mt-3 rounded-2xl border border-emerald-100 bg-[#faf8f4] p-3">
              <QrCode value={qrUri} size={156} logoText="IB" />
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              Set Institute UPI ID in Admin Payment Settings or Super Admin UPI to enable live QR.
            </div>
          )}
          {activeQrUpi && (
            <p className="mt-2 break-all font-mono text-[11px] font-bold text-[#14256f]">{activeQrUpi}</p>
          )}
        </section>
      </div>

      {/* Unified Combined Ledger: Online UPI (Green) + Offline Cash (Blue) + Enrollment Status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-[#14256f]">
          Unified Combined Ledger (Online UPI + Offline Cash &amp; Enrollment Status)
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Every course payment across online checkout and offline desk in one place.
        </p>
        <div className="mt-4 max-h-80 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="pb-2">Date</th>
                <th className="pb-2">Student &amp; Email</th>
                <th className="pb-2">Course Assigned</th>
                <th className="pb-2">Method</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Enrollment</th>
                <th className="pb-2 text-right">Ref / Action</th>
              </tr>
            </thead>
            <tbody>
              {combinedLedger.map((row) => (
                <tr key={row.kind + row.id} className="border-b last:border-0">
                  <td className="py-2.5 text-slate-600">{row.date}</td>
                  <td>
                    <b className="text-slate-900">{row.student_name}</b>
                    {row.student_email && <small className="block text-slate-500">{row.student_email}</small>}
                  </td>
                  <td className="font-medium text-slate-800">{row.course_title}</td>
                  <td>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                        row.kind === "online"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {row.kind === "online" ? "ONLINE UPI" : `OFFLINE ${row.payment_mode}`}
                    </span>
                  </td>
                  <td className={`font-bold ${row.kind === "online" ? "text-emerald-700" : "text-blue-700"}`}>
                    {inr(row.amount_paise)}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        row.enrolled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.enrolled ? "Active ✓" : "Manual"}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-xs text-slate-500">{row.reference}</span>
                    {row.kind === "offline" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteOfflinePayment(row.id)}
                        className="ml-2 text-xs font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {combinedLedger.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">No online or offline payments recorded yet.</p>
          )}
        </div>
      </section>

      {/* Daily / Weekly / Monthly / Yearly Table + Top Sellers by Code */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
              <TrendingUp className="h-5 w-5 text-[#c37a26]" />
              Combined Breakdown ({feePercentLabel}% ERP Fee)
            </h3>
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 text-xs font-bold">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPeriodTab(tab)}
                  className={`rounded-lg px-2.5 py-1.5 capitalize ${
                    periodTab === tab ? "bg-[#14256f] text-white" : "text-slate-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="pb-2">Period</th>
                  <th className="pb-2">Online</th>
                  <th className="pb-2">Offline</th>
                  <th className="pb-2">{feePercentLabel}% Fee</th>
                  <th className="pb-2">Expenses</th>
                  <th className="pb-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {activePeriods.map((row) => {
                  const net = row.income_paise - row.erp_fee_paise - row.expense_paise;
                  return (
                    <tr key={row.period} className="border-b last:border-0">
                      <td className="py-2.5 font-semibold">{row.period}</td>
                      <td className="font-semibold text-emerald-700">{inr(row.online_paise)}</td>
                      <td className="font-semibold text-blue-700">{inr(row.offline_paise)}</td>
                      <td className="font-semibold text-[#c37a26]">{inr(row.erp_fee_paise)}</td>
                      <td className="text-rose-700">{inr(row.expense_paise)}</td>
                      <td className={`font-bold ${net >= 0 ? "text-slate-900" : "text-rose-700"}`}>
                        {inr(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {activePeriods.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">No income or expense records yet.</p>
            )}
          </div>
        </section>

        {/* Top-Selling Courses / Articles by Code */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
            <Receipt className="h-5 w-5 text-[#c37a26]" />
            Top-Selling Courses (Online + Offline by Code)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Combined units sold across online UPI orders and offline desk admissions.
          </p>
          <div className="mt-4 max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Course / Item</th>
                  <th className="pb-2">Sold</th>
                  <th className="pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map((item) => (
                  <tr key={item.code + item.title} className="border-b last:border-0">
                    <td className="py-2.5 font-mono text-xs font-bold text-[#14256f]">{item.code}</td>
                    <td className="pr-2 font-semibold">{item.title}</td>
                    <td className="font-bold">{item.units}</td>
                    <td className="font-bold text-emerald-700">{inr(item.revenue_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topSellers.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">No sales recorded yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Super Admin ERP Maintenance & Payment Gateway Invoices (2% incl. GST) */}
      <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
              <FileSpreadsheet className="h-5 w-5 text-[#c37a26]" />
              ERP Maintenance &amp; Payment Gateway Invoices ({feePercentLabel}% incl. GST)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Linked between Super Admin and Director. Covers {feePercentLabel}% ERP maintenance and payment gateway charges.
              {ownerUpiId ? ` Pay via Super Admin UPI: ${ownerUpiId}` : ""}
            </p>
          </div>
        </div>

        {isOwner && (
          <form onSubmit={createErpInvoice} className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-[#faf8f4] p-4 sm:grid-cols-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500">Billing Cycle</label>
              <select
                value={invCycle}
                onChange={(e) => setInvCycle(e.target.value as "daily" | "weekly" | "monthly" | "yearly")}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500">Period Label</label>
              <input
                required
                value={invPeriod}
                onChange={(e) => setInvPeriod(e.target.value)}
                placeholder="e.g. 2026-11 or Week 47"
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500">Gross Revenue (₹)</label>
              <input
                required
                type="number"
                min="0"
                value={invGrossRupees}
                onChange={(e) => setInvGrossRupees(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                disabled={busy}
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#14256f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send {feePercentLabel}% Invoice
              </button>
            </div>
            <input
              value={invNotes}
              onChange={(e) => setInvNotes(e.target.value)}
              placeholder="Invoice note"
              className="rounded-lg border bg-white px-3 py-2 text-sm sm:col-span-4"
            />
          </form>
        )}

        <div className="mt-4 max-h-72 overflow-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="pb-2">Invoice #</th>
                <th className="pb-2">Cycle / Period</th>
                <th className="pb-2">Gross Sales</th>
                <th className="pb-2">Fee ({feePercentLabel}%)</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Payment Ref / Action</th>
              </tr>
            </thead>
            <tbody>
              {erpInvoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="py-2.5 font-mono text-xs font-bold text-[#14256f]">{inv.invoice_number}</td>
                  <td className="capitalize">
                    <b>{inv.billing_cycle}</b> · {inv.period_label}
                  </td>
                  <td>{inr(inv.gross_income_paise)}</td>
                  <td className="font-bold text-[#c37a26]">{inr(inv.fee_amount_paise)}</td>
                  <td>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : inv.status === "submitted"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    {isOwner ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {inv.payment_ref && (
                          <span className="font-mono text-xs text-slate-600">Ref: {inv.payment_ref}</span>
                        )}
                        {inv.status !== "paid" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void markInvoiceStatus(inv.id, "paid")}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark Paid
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void markInvoiceStatus(inv.id, "unpaid")}
                            className="rounded-lg border px-2.5 py-1 text-xs font-bold text-slate-600"
                          >
                            Mark Unpaid
                          </button>
                        )}
                      </div>
                    ) : inv.status === "paid" ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        Paid {inv.payment_ref ? `(${inv.payment_ref})` : ""}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={payRefMap[inv.id] ?? inv.payment_ref ?? ""}
                          onChange={(e) => setPayRefMap((m) => ({ ...m, [inv.id]: e.target.value }))}
                          placeholder="UPI / Bank Ref"
                          className="w-32 rounded-lg border px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void submitInvoicePayment(inv.id)}
                          className="rounded-lg bg-[#14256f] px-2.5 py-1 text-xs font-bold text-white"
                        >
                          Submit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {erpInvoices.length === 0 && (
            <p className="py-5 text-center text-sm text-slate-500">
              No ERP maintenance invoices sent yet.
            </p>
          )}
        </div>
      </section>

      {/* Log Expense + Tax Rate Settings */}
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={addExpense}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          <h3 className="text-lg font-black text-[#14256f]">Record Business Expense</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Expense title (e.g. Office Rent, Faculty Salary)"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="Amount (₹)"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              required
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes / bill reference"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <button
            disabled={busy}
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-[#14256f]">Tax / GST Settings</h3>
          <p className="mt-1 text-xs text-slate-500">
            Course GST ({summary.gst_percent}%): <b>{inr(summary.gst_amount_paise)}</b> · Base:{" "}
            <b>{inr(summary.base_revenue_paise)}</b>
          </p>
          <label className="mt-4 block text-xs font-bold uppercase text-slate-500">GST Rate (%)</label>
          <input
            type="number"
            min="0"
            max="28"
            value={gstInput}
            onChange={(e) => setGstInput(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <button
            disabled={busy}
            type="button"
            onClick={() => void saveTax()}
            className="mt-3 w-full rounded-xl bg-[#c37a26] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            Save GST Rate
          </button>
        </div>
      </div>

      {/* Recent Expenses Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-[#14256f]">Expense Ledger</h3>
        <div className="mt-4 max-h-72 overflow-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="pb-2">Date</th>
                <th className="pb-2">Title</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Notes</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b last:border-0">
                  <td className="py-2.5 text-slate-600">{exp.expense_date}</td>
                  <td className="font-semibold">{exp.title}</td>
                  <td>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {exp.category}
                    </span>
                  </td>
                  <td className="text-slate-500">{exp.notes || "—"}</td>
                  <td className="font-bold text-rose-700">{inr(exp.amount_paise)}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteExpense(exp.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">No expenses logged yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
