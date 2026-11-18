import { NextRequest, NextResponse } from "next/server";
import { requireCmsAdmin } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { sendCourseReceipt } from "@/lib/commerce/receipt-email";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function authorised() { try { await requireCmsAdmin(); return true; } catch { return false; } }
export async function GET() {
  if (!(await authorised())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const db = createCmsServiceClient();
  const { data, error } = await db.from("course_purchase_orders")
    .select("id,buyer_name,buyer_email,buyer_phone,institute_name,amount_paise,payment_reference,status,receipt_number,receipt_sent_at,created_at,course_id,courses(title)")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (data || []).map(row => row.id);
  const { data: items, error: itemsError } = ids.length ? await db.from("course_purchase_order_items").select("order_id,title_snapshot,amount_paise").in("order_id", ids) : { data: [], error: null };
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  return NextResponse.json({ orders: (data || []).map(row => ({ ...row, items: (items || []).filter(item => item.order_id === row.id) })) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  if (!(await authorised())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = await request.json();
    if (!/^[0-9a-f-]{36}$/i.test(String(body.id || "")) || !["verify", "reject"].includes(body.action))
      return NextResponse.json({ error: "Invalid order action" }, { status: 400 });
    const db = createCmsServiceClient();
    const { data, error } = await db.rpc("verify_course_purchase", { p_order_id: body.id, p_approve: body.action === "verify" });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    const receipt = data?.[0];
    if (receipt?.receipt_number) {
      const { data: items } = await db.from("course_purchase_order_items").select("title_snapshot").eq("order_id", body.id);
      const { data: settings } = await db.from("avit_receipt_delivery_settings").select("notification_email").eq("institute_name", receipt.institute_name).maybeSingle();
      try {
        const sent = await sendCourseReceipt({ to: receipt.buyer_email, cc: settings?.notification_email, buyer: receipt.buyer_name, institute: receipt.institute_name, course: (items || []).map(item => item.title_snapshot).join(", ") || "Course", receipt: receipt.receipt_number, amountPaise: receipt.amount_paise });
        if (sent.sent) await db.from("course_purchase_orders").update({ receipt_sent_at: new Date().toISOString() }).eq("id", body.id);
      } catch { /* Keep the verified payment and printable receipt when email is unavailable. */ }
    }
    return NextResponse.json({ ok: true, receiptNumber: receipt?.receipt_number || null });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Review failed" }, { status: 500 }); }
}
