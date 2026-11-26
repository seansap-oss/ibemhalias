"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { PaymentTemplateEditor } from "@/components/admin/payment-template-editor";

type Order = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  institute_name: string;
  amount_paise: number;
  payment_reference: string | null;
  status: string;
  receipt_number: string | null;
  receipt_sent_at: string | null;
  created_at: string;
  courses: { title: string } | null;
  items: { title_snapshot: string; amount_paise: number }[];
};

export function CoursePaymentReview() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [verifyBanner, setVerifyBanner] = React.useState<{
    message: string;
    whatsappUrl?: string;
  } | null>(null);

  async function load() {
    const r = await fetch("/api/admin/course-payments", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setOrders(j.orders || []);
    else setError(j.error || "Unable to load payments");
  }

  React.useEffect(() => {
    void load();
  }, []);

  async function review(id: string, action: "verify" | "reject") {
    setBusy(id);
    setError("");
    setVerifyBanner(null);
    try {
      const r = await fetch("/api/admin/course-payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);

      if (action === "verify") {
        const parts = ["Payment verified & course enrolled!"];
        if (j.studentCreated && j.tempPassword) {
          parts.push(`New Student Account created (Temp Password: ${j.tempPassword}).`);
        }
        parts.push(j.emailSent ? "Confirmation email sent." : "Email skipped (configure Resend API key for auto-email).");
        const phoneDigits = String(j.buyerPhone || "").replace(/\D/g, "");
        const whatsappUrl =
          phoneDigits && j.whatsappMessage
            ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(j.whatsappMessage)}`
            : undefined;
        setVerifyBanner({ message: parts.join(" "), whatsappUrl });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-[#14256f]">Course payments</h1>
        <p className="mt-2 text-sm text-slate-600">
          Match the UPI reference against your bank/UPI app, then click <b>Verify</b> to auto-create the student account (if new), enroll their course, email their receipt, and send 1-click WhatsApp confirmation.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {verifyBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <span className="font-semibold">{verifyBanner.message}</span>
          {verifyBanner.whatsappUrl && (
            <a
              href={verifyBanner.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              Send WhatsApp Confirmation
            </a>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Buyer", "Course", "Amount", "UPI reference", "Status / receipt", "Action"].map((x) => (
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const courseTitle = o.items?.map((i) => i.title_snapshot).join(", ") || o.courses?.title || "Course";
              const phoneDigits = (o.buyer_phone || "").replace(/\D/g, "");
              const waText =
                o.status === "paid"
                  ? `Hi ${o.buyer_name}, your payment of ₹${(o.amount_paise / 100).toFixed(
                      2
                    )} for ${courseTitle} is verified! Receipt: ${o.receipt_number || ""}. Sign in at ${
                      typeof window !== "undefined" ? window.location.origin : ""
                    }/login using ${o.buyer_email}. — ${o.institute_name}`
                  : `Hi ${o.buyer_name}, we received your UPI reference (${o.payment_reference || ""}) for ${courseTitle}. We are verifying it and will get back shortly. — ${o.institute_name}`;

              return (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-3">
                    <b>{o.buyer_name}</b>
                    <small className="block text-slate-600">{o.buyer_email}</small>
                    {o.buyer_phone && <small className="block text-slate-500">{o.buyer_phone}</small>}
                  </td>
                  <td className="px-4 py-3">{courseTitle}</td>
                  <td className="px-4 py-3 font-bold">₹{(o.amount_paise / 100).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{o.payment_reference || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold capitalize">{o.status}</span>
                    {o.receipt_number && <small className="block text-slate-500">{o.receipt_number}</small>}
                    {o.status === "paid" && (
                      <small className="block text-amber-700">
                        {o.receipt_sent_at ? "Receipt emailed" : "Email pending / not configured"}
                      </small>
                    )}
                    {o.status === "paid" && (
                      <a
                        className="mt-1 block text-xs font-semibold text-blue-700 underline"
                        href={`/api/checkout/receipt?id=${encodeURIComponent(o.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Print receipt
                      </a>
                    )}
                    {phoneDigits && (
                      <a
                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-green-700 underline"
                        href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(waText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {o.status === "paid" ? "WhatsApp Receipt" : "WhatsApp Pending"}
                      </a>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-3">
                    {o.status === "pending" && (
                      <>
                        <button
                          disabled={busy === o.id}
                          onClick={() => void review(o.id, "verify")}
                          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {busy === o.id ? "Verifying…" : "Verify & Enroll"}
                        </button>
                        <button
                          disabled={busy === o.id}
                          onClick={() => void review(o.id, "reject")}
                          className="rounded-lg border px-3 py-2 text-xs font-bold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!orders.length && <p className="p-6 text-slate-500">No purchase orders yet.</p>}
      </div>

      <PaymentTemplateEditor />
    </main>
  );
}
