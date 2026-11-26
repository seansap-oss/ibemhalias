import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireCmsAdmin } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { sendCourseReceipt } from "@/lib/commerce/receipt-email";
import { getPaymentTemplates, renderPaymentTemplate } from "@/lib/commerce/payment-templates";
import { logAdminWork } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorised() {
  try {
    await requireCmsAdmin();
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await authorised())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const db = createCmsServiceClient();
  const { data, error } = await db
    .from("course_purchase_orders")
    .select(
      "id,buyer_name,buyer_email,buyer_phone,institute_name,amount_paise,payment_reference,status,receipt_number,receipt_sent_at,created_at,course_id,courses(title)"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (data || []).map((row) => row.id);
  const { data: items, error: itemsError } = ids.length
    ? await db.from("course_purchase_order_items").select("order_id,title_snapshot,amount_paise").in("order_id", ids)
    : { data: [], error: null };
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  return NextResponse.json(
    { orders: (data || []).map((row) => ({ ...row, items: (items || []).filter((item) => item.order_id === row.id) })) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  if (!(await authorised())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = await request.json();
    if (!/^[0-9a-f-]{36}$/i.test(String(body.id || "")) || !["verify", "reject"].includes(body.action)) {
      return NextResponse.json({ error: "Invalid order action" }, { status: 400 });
    }
    const db = createCmsServiceClient();
    const { data, error } = await db.rpc("verify_course_purchase", {
      p_order_id: body.id,
      p_approve: body.action === "verify",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });

    const receipt = data?.[0];
    await logAdminWork(
      body.action === "verify" ? "Verified Course UPI Payment" : "Rejected Course UPI Payment",
      String(body.id),
      receipt?.buyer_email ? `Buyer: ${receipt.buyer_email}` : undefined
    );

    if (body.action !== "verify" || !receipt?.receipt_number) {
      return NextResponse.json({ ok: true });
    }

    const [{ data: orderRow }, { data: items }, { data: settings }, templates] = await Promise.all([
      db
        .from("course_purchase_orders")
        .select("id,course_id,buyer_user_id,buyer_email,buyer_name,buyer_phone,payment_reference")
        .eq("id", body.id)
        .maybeSingle(),
      db.from("course_purchase_order_items").select("course_id,title_snapshot").eq("order_id", body.id),
      db
        .from("avit_receipt_delivery_settings")
        .select("notification_email")
        .eq("institute_name", receipt.institute_name)
        .maybeSingle(),
      getPaymentTemplates(),
    ]);

    const buyerEmail = String(receipt.buyer_email || orderRow?.buyer_email || "").trim().toLowerCase();
    const buyerName = String(receipt.buyer_name || orderRow?.buyer_name || "Student").trim();
    const buyerPhone = String(orderRow?.buyer_phone || "").trim();
    const courseTitle = (items || []).map((item) => item.title_snapshot).join(", ") || "Course";

    // Auto-create student account if none exists yet, and auto-enroll
    let studentId: string | null = orderRow?.buyer_user_id || null;
    let studentCreated = false;
    let tempPassword: string | null = null;

    if (!studentId && buyerEmail) {
      const { data: existingProfile } = await db
        .from("profiles")
        .select("id")
        .eq("email", buyerEmail)
        .maybeSingle();

      if (existingProfile?.id) {
        studentId = existingProfile.id;
      } else {
        tempPassword = `Ias@${randomBytes(3).toString("hex")}`;
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email: buyerEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: buyerName, phone: buyerPhone },
          app_metadata: { role: "student" },
        });
        if (!createErr && created.user) {
          studentId = created.user.id;
          studentCreated = true;
          await db.from("profiles").upsert(
            {
              id: studentId,
              email: buyerEmail,
              full_name: buyerName,
              role: "student",
            },
            { onConflict: "id" }
          );
        }
      }

      if (studentId) {
        await db.from("course_purchase_orders").update({ buyer_user_id: studentId }).eq("id", body.id);
      }
    }

    // Auto-enroll student in all purchased courses
    const courseIds = new Set<string>();
    if (orderRow?.course_id) courseIds.add(orderRow.course_id);
    for (const item of items || []) {
      if (item.course_id) courseIds.add(item.course_id);
    }
    if (studentId && courseIds.size > 0) {
      for (const cid of courseIds) {
        await db
          .from("enrollments")
          .upsert({ user_id: studentId, course_id: cid, status: "active" }, { onConflict: "user_id,course_id" })
          .select("id")
          .maybeSingle();
      }
    }

    const origin = request.nextUrl.origin || "https://ibemhal-ias-lms-preview.vercel.app";
    const verifiedMessage = renderPaymentTemplate(templates.verifiedTemplate, {
      name: buyerName,
      course: courseTitle,
      amount: (Number(receipt.amount_paise || 0) / 100).toFixed(2),
      reference: orderRow?.payment_reference || "—",
      receipt: receipt.receipt_number,
      email: buyerEmail,
      password: tempPassword || undefined,
      loginUrl: `${origin}/login`,
    });

    let emailSent = false;
    try {
      const sent = await sendCourseReceipt({
        to: buyerEmail,
        cc: settings?.notification_email,
        buyer: buyerName,
        institute: receipt.institute_name,
        course: courseTitle,
        receipt: receipt.receipt_number,
        amountPaise: receipt.amount_paise,
        customMessage: verifiedMessage,
        tempPassword,
        loginUrl: `${origin}/login`,
      });
      emailSent = Boolean(sent.sent);
      if (sent.sent) {
        await db.from("course_purchase_orders").update({ receipt_sent_at: new Date().toISOString() }).eq("id", body.id);
      }
    } catch {
      emailSent = false;
    }

    return NextResponse.json({
      ok: true,
      studentCreated,
      tempPassword,
      emailSent,
      whatsappMessage: verifiedMessage,
      buyerPhone,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Review failed" }, { status: 500 });
  }
}
