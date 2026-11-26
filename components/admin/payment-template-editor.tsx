"use client";

import * as React from "react";
import { MessageSquareText, Save } from "lucide-react";

export function PaymentTemplateEditor() {
  const [pendingTemplate, setPendingTemplate] = React.useState("");
  const [verifiedTemplate, setVerifiedTemplate] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    void fetch("/api/admin/payment-templates", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.pendingTemplate) setPendingTemplate(j.pendingTemplate);
        if (j.verifiedTemplate) setVerifiedTemplate(j.verifiedTemplate);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/payment-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pendingTemplate, verifiedTemplate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to save templates.");
      setStatus("Payment confirmation templates saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to save templates.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-black text-[#14256f]">
        <MessageSquareText className="h-5 w-5 text-[#c37a26]" />
        Automated Email &amp; WhatsApp Payment Templates
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Shared by Admin &amp; Director. Placeholders:{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">{"{{name}}"}</code>,{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">{"{{course}}"}</code>,{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">{"{{amount}}"}</code>,{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">{"{{reference}}"}</code>,{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">{"{{receipt}}"}</code>,{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">{"{{email}}"}</code>,{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">{"{{credentials_note}}"}</code>,{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">{"{{login_url}}"}</code>
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading templates…</p>
      ) : (
        <form onSubmit={save} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              1. Pending Payment Confirmation (Sent on UPI form submit)
            </label>
            <textarea
              rows={2}
              value={pendingTemplate}
              onChange={(e) => setPendingTemplate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              2. Verified &amp; Course Assigned (Sent when Admin verifies UPI payment)
            </label>
            <textarea
              rows={3}
              value={verifiedTemplate}
              onChange={(e) => setVerifiedTemplate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={busy}
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#14256f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {busy ? "Saving…" : "Save Templates"}
            </button>
            {status && <span className="text-sm font-semibold text-amber-800">{status}</span>}
          </div>
        </form>
      )}
    </section>
  );
}
