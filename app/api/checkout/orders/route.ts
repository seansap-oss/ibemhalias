import { NextRequest, NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { createSessionClient } from "@/lib/supabase/server-session";
import { getPaymentTemplates, renderPaymentTemplate } from "@/lib/commerce/payment-templates";
import { sendPendingPaymentEmail } from "@/lib/commerce/receipt-email";
import { checkRateLimit, getClientIp, recordRateLimitHit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(value || ""));

export async function POST(request: NextRequest) {
  try {
    const rlKey = `checkout-order:${getClientIp(request)}`;
    const rl = checkRateLimit(rlKey, 15, 15 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many checkout requests. Please wait a few minutes before trying again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }
    recordRateLimitHit(rlKey, 15 * 60_000);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const reference = String(body.paymentReference || "").trim();
    const phone = String(body.phone || "").trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const courseIds: string[] = Array.isArray(body.courseIds) ? body.courseIds : [body.courseId];
    if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || phoneDigits.length < 10 || !/^[a-zA-Z0-9-]{6,64}$/.test(reference) || courseIds.length < 1 || courseIds.length > 10 || courseIds.some((id) => !uuid(id)) || new Set(courseIds).size !== courseIds.length) {
      return NextResponse.json({ error: "Enter a valid name, 10+ digit phone, email, UPI reference and 1 to 10 courses." }, { status: 400 });
    }
    const db = createCmsServiceClient();
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    const buyerId = user?.email?.toLowerCase() === email ? user.id : null;
    if (courseIds.length > 1 || Array.isArray(body.courseIds)) {
      const { data, error } = await db.rpc("create_course_cart_order", { p_course_ids: courseIds, p_buyer_name: name, p_buyer_email: email, p_buyer_phone: phone, p_payment_reference: reference, p_buyer_user_id: buyerId });
      if (error || !data?.[0]) return NextResponse.json({ error: error?.message || "Unable to create cart order. Apply migration 025." }, { status: 409 });
      const { data: courseRows } = await db.from("courses").select("title").in("id", courseIds);
      const courseNames = (courseRows || []).map((c) => c.title).join(", ") || "Course(s)";
      const templates = await getPaymentTemplates();
      const pendingMessage = renderPaymentTemplate(templates.pendingTemplate, {
        name,
        course: courseNames,
        amount: (Number(data[0].amount_paise || 0) / 100).toFixed(2),
        reference,
        email,
      });
      const { data: settings } = await db.from("avit_receipt_delivery_settings").select("notification_email").eq("institute_name", "Ibemhal IAS").maybeSingle();
      const mail = await sendPendingPaymentEmail({
        to: email,
        cc: settings?.notification_email,
        buyer: name,
        institute: "Ibemhal IAS",
        course: courseNames,
        amountPaise: Number(data[0].amount_paise || 0),
        reference,
        customMessage: pendingMessage,
      }).catch(() => ({ sent: false }));
      return NextResponse.json({ ok: true, pendingMessage, emailSent: mail.sent, order: { id: data[0].order_id, amount_paise: data[0].amount_paise, status: "pending", institute_name: "Ibemhal IAS" } }, { headers: { "Cache-Control": "no-store" } });
    }
    // Preserve the existing single-course checkout and its discount code.
    const { data: course, error: courseError } = await db.from("courses").select("id,title,price_inr,discounted_price_inr,is_published").eq("id", courseIds[0]).single();
    if (courseError || !course?.is_published) return NextResponse.json({ error: "This course is unavailable." }, { status: 404 });
    let price = Number(course.discounted_price_inr ?? course.price_inr);
    if (!Number.isFinite(price) || price < 0) throw new Error("Invalid course price");
    let code: string | null = null;
    const requestedCode = String(body.promoCode || "").trim().toUpperCase();
    if (requestedCode) { const { data, error } = await db.rpc("validate_discount_code", { p_code: requestedCode, p_course_id: courseIds[0] }); if (error || !data?.valid) return NextResponse.json({ error: "Promo code is no longer valid." }, { status: 400 }); price = Number(data.finalPrice); code = requestedCode; }
    const { data: order, error } = await db.from("course_purchase_orders").insert({ course_id: courseIds[0], buyer_user_id: buyerId, buyer_name: name, buyer_email: email, buyer_phone: phone || null, amount_paise: Math.round(price * 100), promo_code: code, payment_reference: reference }).select("id,amount_paise,status,institute_name").single();
    if (error) throw error;
    // A migrated database records one line item for legacy checkout too.
    const { error: itemError } = await db.from("course_purchase_order_items").insert({ order_id: order.id, course_id: course.id, title_snapshot: course.title, amount_paise: order.amount_paise });
    if (itemError) {
      await db.from("course_purchase_orders").delete().eq("id", order.id).eq("status", "pending");
      throw itemError;
    }
    const templates = await getPaymentTemplates();
    const pendingMessage = renderPaymentTemplate(templates.pendingTemplate, {
      name,
      course: course.title,
      amount: (Number(order.amount_paise || 0) / 100).toFixed(2),
      reference,
      email,
    });
    const { data: settings } = await db.from("avit_receipt_delivery_settings").select("notification_email").eq("institute_name", "Ibemhal IAS").maybeSingle();
    const mail = await sendPendingPaymentEmail({
      to: email,
      cc: settings?.notification_email,
      buyer: name,
      institute: "Ibemhal IAS",
      course: course.title,
      amountPaise: Number(order.amount_paise || 0),
      reference,
      customMessage: pendingMessage,
    }).catch(() => ({ sent: false }));
    return NextResponse.json({ ok: true, pendingMessage, emailSent: mail.sent, order }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Unable to create order" }, { status: 500 });
  }
}
