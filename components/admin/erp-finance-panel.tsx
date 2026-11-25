"use client";

import * as React from "react";
import { CheckCircle2, FileSpreadsheet, Plus, Receipt, Send, Trash2, TrendingUp } from "lucide-react";

interface ErpSummary {
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
  pending_orders_count: number;
}

interface PeriodRow {
  period: string;
  income_paise: number;
  expense_paise: number;
  erp_fee_paise: number;
  orders: number;
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
  summary: ErpSummary;
  daily: PeriodRow[];
  weekly: PeriodRow[];
  monthly: PeriodRow[];
  yearly: PeriodRow[];
  expenses: ExpenseRow[];
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
  const [periodTab, setPeriodTab] = React.useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

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
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load ERP data.");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

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
        Loading ERP financial summary, 2% maintenance fee, tax &amp; expenses…
      </section>
    );
  }

  const { summary, daily, weekly, monthly, yearly, expenses, topSellers, erpInvoices, isOwner, ownerUpiId } = data;
  const feePercentLabel = (summary.erp_fee_bps / 100).toFixed(2);
  const activePeriods =
    periodTab === "daily" ? daily : periodTab === "weekly" ? weekly : periodTab === "monthly" ? monthly : yearly;

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Income</p>
          <p className="mt-2 text-2xl font-black text-[#14256f]">{inr(summary.gross_income_paise)}</p>
          <p className="mt-1 text-xs text-slate-500">{summary.paid_orders_count} verified orders</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
            ERP &amp; Gateway Fee ({feePercentLabel}%)
          </p>
          <p className="mt-2 text-2xl font-black text-[#c37a26]">{inr(summary.erp_fee_paise)}</p>
          <p className="mt-1 text-xs text-amber-900">Incl. all charges &amp; GST</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Course GST ({summary.gst_percent}% incl.)
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900">{inr(summary.gst_amount_paise)}</p>
          <p className="mt-1 text-xs text-slate-500">Base: {inr(summary.base_revenue_paise)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Expenses</p>
          <p className="mt-2 text-2xl font-black text-rose-700">{inr(summary.total_expenses_paise)}</p>
          <p className="mt-1 text-xs text-slate-500">{expenses.length} logged items</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Profit (After 2% Fee)</p>
          <p
            className={`mt-2 text-2xl font-black ${
              summary.net_after_erp_fee_paise >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {inr(summary.net_after_erp_fee_paise)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Before fee: {inr(summary.net_profit_paise)}</p>
        </div>
      </div>

      {statusMsg && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
          {statusMsg}
        </p>
      )}

      {/* Daily / Weekly / Monthly / Yearly Breakdown + Top Sellers by Code */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
              <TrendingUp className="h-5 w-5 text-[#c37a26]" />
              Income, {feePercentLabel}% Fee &amp; Expenses
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
                  <th className="pb-2">Orders</th>
                  <th className="pb-2">Income</th>
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
                      <td>{row.orders}</td>
                      <td className="font-semibold text-emerald-700">{inr(row.income_paise)}</td>
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
            <Receipt className="h-5 w-5 text-[#c37a26]" />
            Top-Selling Courses &amp; Items (by Code)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Ranked by verified paid orders so Director and Super Admin see the most popular courses.
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
              <p className="py-6 text-center text-sm text-slate-500">No verified sales yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Super Admin ERP Maintenance & Payment Gateway Invoices (2% incl. GST) */}
      <section className="rounded-2xl border border-amber-200 bg-white p-5">
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
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2"
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-black text-[#14256f]">Tax / GST Settings</h3>
          <p className="mt-1 text-xs text-slate-500">
            Configure GST % applied to gross course collections for tax reporting.
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
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
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
