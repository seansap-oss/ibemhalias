import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { canManageCourses } from "@/lib/course-admin";
import { canViewDirector } from "@/lib/director-access";
import { hasOwnerSession } from "@/lib/super-admin";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { logAdminWork } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

async function canAccessErp() {
  if (await hasOwnerSession()) return true;
  if (await canViewDirector()) return true;
  return await canManageCourses();
}

function getIsoWeekLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function computeAiForecast(seriesAscending: number[]) {
  if (seriesAscending.length === 0) {
    return { nextPaise: 0, growthPercent: 0, confidenceLabel: "Awaiting initial sales" };
  }
  if (seriesAscending.length === 1) {
    const val = seriesAscending[0];
    return {
      nextPaise: Math.round(val * 1.12),
      growthPercent: 12,
      confidenceLabel: "Baseline projection (+12%)",
    };
  }
  const recent = seriesAscending.slice(-6);
  const n = recent.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recent[i];
    sumXY += i * recent[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const predicted = Math.max(0, Math.round(intercept + slope * n));
  const lastVal = recent[n - 1] || 1;
  const growthPercent = lastVal > 0 ? Math.round(((predicted - lastVal) / lastVal) * 100) : 0;
  return {
    nextPaise: predicted,
    growthPercent: Math.max(-50, Math.min(200, growthPercent)),
    confidenceLabel: n >= 3 ? "AI Trend Regression" : "Moving Average",
  };
}

export async function GET() {
  if (!(await canAccessErp())) {
    return NextResponse.json({ error: "Director, Admin, or Super Admin access required" }, { status: 403 });
  }

  const isOwner = await hasOwnerSession();
  const db = createCmsServiceClient();

  const [
    ordersRes,
    itemsRes,
    coursesRes,
    expensesRes,
    offlineRes,
    taxRes,
    platformRes,
    receiptSettingsRes,
    qrConfigRes,
    invoicesRes,
  ] = await Promise.all([
    db
      .from("course_purchase_orders")
      .select("id, course_id, buyer_user_id, buyer_name, buyer_email, buyer_phone, amount_paise, payment_reference, status, created_at, paid_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    db
      .from("course_purchase_order_items")
      .select("order_id, course_id, title_snapshot, amount_paise")
      .limit(4000),
    db
      .from("courses")
      .select("id, title, slug")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("cms_content")
      .select("id, title, month_label, date_label, sort_order, description, created_at")
      .eq("section_path", "erp-expenses")
      .order("date_label", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("cms_content")
      .select("id, title, month_label, date_label, sort_order, description, course_id, asset_number, created_at")
      .eq("section_path", "erp-offline-income")
      .order("date_label", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("cms_content")
      .select("id, sort_order")
      .eq("section_path", "erp-tax-config")
      .limit(1)
      .maybeSingle(),
    db
      .from("avit_platform_settings")
      .select("fee_bps, fee_includes_gst, owner_upi_id")
      .eq("id", true)
      .maybeSingle(),
    db
      .from("avit_receipt_delivery_settings")
      .select("payment_upi_id")
      .eq("institute_name", "Ibemhal IAS")
      .maybeSingle(),
    db
      .from("cms_content")
      .select("title, external_url, description")
      .eq("section_path", "payment-qr-config")
      .limit(1)
      .maybeSingle(),
    db
      .from("cms_content")
      .select("id, title, month_label, date_label, sort_order, description, asset_number, external_url, created_at")
      .eq("section_path", "erp-fee-invoices")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (
    ordersRes.error ||
    itemsRes.error ||
    coursesRes.error ||
    expensesRes.error ||
    offlineRes.error ||
    invoicesRes.error
  ) {
    const errMsg =
      ordersRes.error?.message ||
      itemsRes.error?.message ||
      coursesRes.error?.message ||
      expensesRes.error?.message ||
      offlineRes.error?.message ||
      invoicesRes.error?.message ||
      "Unable to load ERP data.";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  const feeBps =
    typeof platformRes.data?.fee_bps === "number" && platformRes.data.fee_bps >= 0
      ? platformRes.data.fee_bps
      : 200;

  const gstPercent =
    typeof taxRes.data?.sort_order === "number" && taxRes.data.sort_order >= 0 && taxRes.data.sort_order <= 28
      ? taxRes.data.sort_order
      : 18;

  const orders = ordersRes.data || [];
  const items = itemsRes.data || [];
  const courses = coursesRes.data || [];
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const paidOrders = orders.filter((o) => o.status === "paid");
  const paidOrderIds = new Set(paidOrders.map((o) => o.id));

  const expenses = (expensesRes.data || []).map((row) => ({
    id: row.id,
    title: row.title || "Expense",
    category: row.month_label || "Other",
    expense_date: row.date_label || String(row.created_at).slice(0, 10),
    amount_paise: Number(row.sort_order || 0),
    notes: row.description || "",
  }));

  const offlinePayments = (offlineRes.data || []).map((row) => {
    let meta: {
      student_name?: string;
      student_email?: string;
      student_phone?: string;
      course_title?: string;
      enrolled?: boolean;
      notes?: string;
    } = {};
    try {
      meta = JSON.parse(row.description || "{}");
    } catch {
      meta = {};
    }
    return {
      id: row.id,
      receipt_number: row.asset_number || `OFF-${row.id.slice(0, 6).toUpperCase()}`,
      student_name: meta.student_name || row.title || "Walk-in Student",
      student_email: meta.student_email || "",
      student_phone: meta.student_phone || "",
      course_id: row.course_id || null,
      course_title: meta.course_title || (row.course_id ? courseMap.get(row.course_id)?.title : undefined) || "Course",
      payment_mode: (row.month_label || "cash") as "cash" | "bank" | "card",
      payment_date: row.date_label || String(row.created_at).slice(0, 10),
      amount_paise: Number(row.sort_order || 0),
      enrolled: Boolean(meta.enrolled),
      notes: meta.notes || "",
      created_at: row.created_at,
    };
  });

  type PeriodBucket = {
    period: string;
    online_paise: number;
    offline_paise: number;
    income_paise: number;
    expense_paise: number;
    erp_fee_paise: number;
    orders: number;
  };

  const dailyMap = new Map<string, PeriodBucket>();
  const weeklyMap = new Map<string, PeriodBucket>();
  const monthlyMap = new Map<string, PeriodBucket>();
  const yearlyMap = new Map<string, PeriodBucket>();

  const ensureBucket = (map: Map<string, PeriodBucket>, key: string): PeriodBucket => {
    const existing = map.get(key);
    if (existing) return existing;
    const fresh: PeriodBucket = {
      period: key,
      online_paise: 0,
      offline_paise: 0,
      income_paise: 0,
      expense_paise: 0,
      erp_fee_paise: 0,
      orders: 0,
    };
    map.set(key, fresh);
    return fresh;
  };

  const addIncome = (
    map: Map<string, PeriodBucket>,
    key: string,
    amountPaise: number,
    channel: "online" | "offline"
  ) => {
    const b = ensureBucket(map, key);
    if (channel === "online") b.online_paise += amountPaise;
    else b.offline_paise += amountPaise;
    b.income_paise = b.online_paise + b.offline_paise;
    b.erp_fee_paise = Math.round((b.income_paise * feeBps) / 10000);
    b.orders += 1;
  };

  const addExpense = (map: Map<string, PeriodBucket>, key: string, amountPaise: number) => {
    const b = ensureBucket(map, key);
    b.expense_paise += amountPaise;
  };

  for (const order of paidOrders) {
    const dt = new Date(order.paid_at || order.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const amt = Number(order.amount_paise || 0);
    addIncome(dailyMap, dt, amt, "online");
    addIncome(weeklyMap, getIsoWeekLabel(dt), amt, "online");
    addIncome(monthlyMap, dt.slice(0, 7), amt, "online");
    addIncome(yearlyMap, dt.slice(0, 4), amt, "online");
  }

  for (const off of offlinePayments) {
    const dt = off.payment_date.slice(0, 10);
    addIncome(dailyMap, dt, off.amount_paise, "offline");
    addIncome(weeklyMap, getIsoWeekLabel(dt), off.amount_paise, "offline");
    addIncome(monthlyMap, dt.slice(0, 7), off.amount_paise, "offline");
    addIncome(yearlyMap, dt.slice(0, 4), off.amount_paise, "offline");
  }

  for (const exp of expenses) {
    const dt = exp.expense_date.slice(0, 10);
    addExpense(dailyMap, dt, exp.amount_paise);
    addExpense(weeklyMap, getIsoWeekLabel(dt), exp.amount_paise);
    addExpense(monthlyMap, dt.slice(0, 7), exp.amount_paise);
    addExpense(yearlyMap, dt.slice(0, 4), exp.amount_paise);
  }

  const daily = [...dailyMap.values()].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 30);
  const weekly = [...weeklyMap.values()].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 26);
  const monthly = [...monthlyMap.values()].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 12);
  const yearly = [...yearlyMap.values()].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 10);

  // AI Forecast on Weekly & Monthly combined income
  const weeklyForecast = computeAiForecast([...weekly].reverse().map((w) => w.income_paise));
  const monthlyForecast = computeAiForecast([...monthly].reverse().map((m) => m.income_paise));

  // Top-selling courses / items by code (Online + Offline combined)
  const salesMap = new Map<string, { code: string; title: string; units: number; revenue_paise: number }>();
  for (const item of items) {
    if (!paidOrderIds.has(item.order_id)) continue;
    const course = courseMap.get(item.course_id);
    const code = course?.slug
      ? course.slug.toUpperCase().slice(0, 18)
      : `CRS-${String(item.course_id || "ITEM").slice(0, 6).toUpperCase()}`;
    const key = item.course_id || item.title_snapshot;
    const existing = salesMap.get(key) || {
      code,
      title: item.title_snapshot || course?.title || "Course",
      units: 0,
      revenue_paise: 0,
    };
    existing.units += 1;
    existing.revenue_paise += Number(item.amount_paise || 0);
    salesMap.set(key, existing);
  }
  for (const off of offlinePayments) {
    const course = off.course_id ? courseMap.get(off.course_id) : undefined;
    const code = course?.slug
      ? course.slug.toUpperCase().slice(0, 18)
      : off.course_id
      ? `CRS-${String(off.course_id).slice(0, 6).toUpperCase()}`
      : "OFFLINE";
    const key = off.course_id || off.course_title;
    const existing = salesMap.get(key) || {
      code,
      title: off.course_title,
      units: 0,
      revenue_paise: 0,
    };
    existing.units += 1;
    existing.revenue_paise += off.amount_paise;
    salesMap.set(key, existing);
  }
  const topSellers = [...salesMap.values()]
    .sort((a, b) => b.units - a.units || b.revenue_paise - a.revenue_paise)
    .slice(0, 15);

  const onlineIncomePaise = paidOrders.reduce((sum, o) => sum + Number(o.amount_paise || 0), 0);
  const offlineIncomePaise = offlinePayments.reduce((sum, o) => sum + o.amount_paise, 0);
  const grossIncomePaise = onlineIncomePaise + offlineIncomePaise;
  const totalExpensesPaise = expenses.reduce((sum, e) => sum + e.amount_paise, 0);
  const baseRevenuePaise = Math.round(grossIncomePaise / (1 + gstPercent / 100));
  const gstAmountPaise = grossIncomePaise - baseRevenuePaise;
  const erpFeePaise = Math.round((grossIncomePaise * feeBps) / 10000);
  const netProfitPaise = grossIncomePaise - totalExpensesPaise;
  const netAfterErpFeePaise = netProfitPaise - erpFeePaise;

  // Combined Unified Ledger (Online UPI + Offline Cash/Bank/Card)
  const orderItemsByOrder = new Map<string, string[]>();
  for (const it of items) {
    const list = orderItemsByOrder.get(it.order_id) || [];
    list.push(it.title_snapshot);
    orderItemsByOrder.set(it.order_id, list);
  }

  const combinedLedger = [
    ...paidOrders.map((o) => ({
      id: o.id,
      kind: "online" as const,
      student_name: o.buyer_name,
      student_email: o.buyer_email,
      student_phone: o.buyer_phone || "",
      course_title: orderItemsByOrder.get(o.id)?.join(", ") || (o.course_id ? courseMap.get(o.course_id)?.title : "") || "Course",
      payment_mode: "online_upi",
      amount_paise: Number(o.amount_paise || 0),
      date: new Date(o.paid_at || o.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
      enrolled: Boolean(o.buyer_user_id),
      reference: o.payment_reference || "UPI",
    })),
    ...offlinePayments.map((o) => ({
      id: o.id,
      kind: "offline" as const,
      student_name: o.student_name,
      student_email: o.student_email,
      student_phone: o.student_phone,
      course_title: o.course_title,
      payment_mode: o.payment_mode,
      amount_paise: o.amount_paise,
      date: o.payment_date,
      enrolled: o.enrolled,
      reference: o.receipt_number,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60);

  const erpInvoices = (invoicesRes.data || []).map((inv) => {
    let meta: { gross_income_paise?: number; fee_bps?: number; status?: string; notes?: string; payment_ref?: string } = {};
    try {
      meta = JSON.parse(inv.description || "{}");
    } catch {
      meta = {};
    }
    return {
      id: inv.id,
      invoice_number: inv.asset_number || `INV-${inv.id.slice(0, 6).toUpperCase()}`,
      billing_cycle: inv.month_label || "monthly",
      period_label: inv.date_label || inv.title || "Period",
      gross_income_paise: Number(meta.gross_income_paise || 0),
      fee_bps: Number(meta.fee_bps ?? feeBps),
      fee_amount_paise: Number(inv.sort_order || 0),
      status: meta.status || "unpaid",
      payment_ref: meta.payment_ref || inv.external_url || "",
      notes: meta.notes || "",
      created_at: inv.created_at,
    };
  });

  return NextResponse.json(
    {
      isOwner,
      ownerUpiId: platformRes.data?.owner_upi_id || null,
      instituteUpiId: receiptSettingsRes.data?.payment_upi_id || null,
      paymentQrConfig: {
        instituteName: qrConfigRes.data?.title || "Ibemhal IAS",
        qrImageUrl: qrConfigRes.data?.external_url || "",
        paymentNote:
          qrConfigRes.data?.description ||
          "Make sure you are sending payment to the right QR code for Ibemhal IAS.",
      },
      courses,
      summary: {
        online_income_paise: onlineIncomePaise,
        offline_income_paise: offlineIncomePaise,
        gross_income_paise: grossIncomePaise,
        base_revenue_paise: baseRevenuePaise,
        gst_percent: gstPercent,
        gst_amount_paise: gstAmountPaise,
        total_expenses_paise: totalExpensesPaise,
        net_profit_paise: netProfitPaise,
        erp_fee_bps: feeBps,
        erp_fee_paise: erpFeePaise,
        net_after_erp_fee_paise: netAfterErpFeePaise,
        paid_orders_count: paidOrders.length,
        offline_orders_count: offlinePayments.length,
        pending_orders_count: orders.filter((o) => o.status === "pending").length,
        ai_forecast: {
          weekly: weeklyForecast,
          monthly: monthlyForecast,
        },
      },
      daily,
      weekly,
      monthly,
      yearly,
      expenses,
      offlinePayments,
      combinedLedger,
      topSellers,
      erpInvoices,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(request: NextRequest) {
  if (!(await canAccessErp())) {
    return NextResponse.json({ error: "Director, Admin, or Super Admin access required" }, { status: 403 });
  }

  const isOwner = await hasOwnerSession();
  const body = await request.json();
  const db = createCmsServiceClient();

  if (body.action === "save_payment_settings") {
    const upiId = String(body.payment_upi_id || "").trim();
    const instituteName = String(body.institute_name || "Ibemhal IAS").trim() || "Ibemhal IAS";
    const qrImageUrl = String(body.qr_image_url || "").trim();
    const paymentNote =
      String(body.payment_note || "").trim() ||
      `Make sure you are sending payment to the right QR code for ${instituteName}.`;

    if (upiId && !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(upiId)) {
      return NextResponse.json({ error: "Enter a valid UPI ID (e.g. name@bank)." }, { status: 400 });
    }

    const { error: upiErr } = await db
      .from("avit_receipt_delivery_settings")
      .update({ payment_upi_id: upiId || null, updated_at: new Date().toISOString() })
      .eq("institute_name", "Ibemhal IAS");

    if (upiErr) {
      return NextResponse.json({ error: upiErr.message }, { status: 500 });
    }

    const existingQr = await db
      .from("cms_content")
      .select("id")
      .eq("section_path", "payment-qr-config")
      .limit(1)
      .maybeSingle();

    if (existingQr.data?.id) {
      const { error: qrErr } = await db
        .from("cms_content")
        .update({
          title: instituteName,
          external_url: qrImageUrl || null,
          description: paymentNote,
        })
        .eq("id", existingQr.data.id);
      if (qrErr) return NextResponse.json({ error: qrErr.message }, { status: 500 });
    } else {
      const { error: qrErr } = await db.from("cms_content").insert({
        section_path: "payment-qr-config",
        title: instituteName,
        external_url: qrImageUrl || null,
        description: paymentNote,
        media_type: "image",
        is_published: false,
        access_level: "premium",
      });
      if (qrErr) return NextResponse.json({ error: qrErr.message }, { status: 500 });
    }

    await logAdminWork("Updated Institute UPI & QR Settings", instituteName, upiId || "QR updated");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_offline_payment") {
    const studentName = String(body.student_name || "").trim();
    const studentEmail = String(body.student_email || "").trim().toLowerCase();
    const studentPhone = String(body.student_phone || "").trim();
    const courseId = String(body.course_id || "").trim() || null;
    const courseTitle = String(body.course_title || "Course").trim();
    const paymentMode = ["cash", "bank", "card"].includes(String(body.payment_mode))
      ? String(body.payment_mode)
      : "cash";
    const paymentDate = String(
      body.payment_date || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    ).slice(0, 10);
    const amountRupees = Number(body.amount_rupees);
    const autoEnroll = body.auto_enroll !== false;
    const notes = String(body.notes || "").trim();

    if (!studentName || Number.isNaN(amountRupees) || amountRupees <= 0) {
      return NextResponse.json({ error: "Enter valid student name and amount." }, { status: 400 });
    }

    let enrolled = false;
    let studentCreated = false;
    let tempPassword: string | null = null;

    if (autoEnroll && courseId && /^\S+@\S+\.\S+$/.test(studentEmail)) {
      let studentId: string | null = null;
      const { data: existingProfile } = await db
        .from("profiles")
        .select("id")
        .eq("email", studentEmail)
        .maybeSingle();

      if (existingProfile?.id) {
        studentId = existingProfile.id;
      } else {
        tempPassword = `Ias@${randomBytes(3).toString("hex")}`;
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email: studentEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: studentName, phone: studentPhone },
          app_metadata: { role: "student" },
        });
        if (!createErr && created.user) {
          studentId = created.user.id;
          studentCreated = true;
          await db.from("profiles").upsert(
            { id: studentId, email: studentEmail, full_name: studentName, role: "student" },
            { onConflict: "id" }
          );
        }
      }

      if (studentId) {
        const { error: enrollErr } = await db
          .from("enrollments")
          .upsert({ user_id: studentId, course_id: courseId, status: "active" }, { onConflict: "user_id,course_id" });
        if (!enrollErr) enrolled = true;
      }
    }

    const receiptNum = `OFF-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    const { error } = await db.from("cms_content").insert({
      section_path: "erp-offline-income",
      title: studentName,
      month_label: paymentMode,
      date_label: paymentDate,
      sort_order: Math.round(amountRupees * 100),
      course_id: courseId,
      asset_number: receiptNum,
      description: JSON.stringify({
        student_name: studentName,
        student_email: studentEmail,
        student_phone: studentPhone,
        course_title: courseTitle,
        enrolled,
        notes,
      }),
      media_type: "note",
      is_published: false,
      access_level: "premium",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminWork(
      `Recorded Offline ${paymentMode.toUpperCase()} Payment`,
      `${studentName} · ₹${amountRupees}`,
      courseTitle
    );

    return NextResponse.json({
      ok: true,
      receipt_number: receiptNum,
      enrolled,
      studentCreated,
      tempPassword,
    });
  }

  if (body.action === "delete_offline_payment") {
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "Payment id required." }, { status: 400 });
    const { error } = await db
      .from("cms_content")
      .delete()
      .eq("id", id)
      .eq("section_path", "erp-offline-income");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_expense") {
    const title = String(body.title || "").trim();
    const category = String(body.category || "Other").trim();
    const expenseDate = String(body.expense_date || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })).slice(0, 10);
    const amountRupees = Number(body.amount_rupees);
    const notes = String(body.notes || "").trim();

    if (!title || Number.isNaN(amountRupees) || amountRupees <= 0) {
      return NextResponse.json({ error: "Enter a valid expense title and amount." }, { status: 400 });
    }

    const { error } = await db.from("cms_content").insert({
      section_path: "erp-expenses",
      title,
      month_label: category,
      date_label: expenseDate,
      sort_order: Math.round(amountRupees * 100),
      description: notes || null,
      media_type: "note",
      is_published: false,
      access_level: "premium",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_expense") {
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Expense id required." }, { status: 400 });
    }
    const { error } = await db
      .from("cms_content")
      .delete()
      .eq("id", id)
      .eq("section_path", "erp-expenses");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_tax") {
    const gstPercent = Number(body.gst_percent);
    if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 28) {
      return NextResponse.json({ error: "GST % must be between 0 and 28." }, { status: 400 });
    }

    const existing = await db
      .from("cms_content")
      .select("id")
      .eq("section_path", "erp-tax-config")
      .limit(1)
      .maybeSingle();

    if (existing.data?.id) {
      const { error } = await db
        .from("cms_content")
        .update({ sort_order: Math.round(gstPercent) })
        .eq("id", existing.data.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await db.from("cms_content").insert({
        section_path: "erp-tax-config",
        title: "GST Configuration",
        sort_order: Math.round(gstPercent),
        media_type: "note",
        is_published: false,
        access_level: "premium",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create_erp_invoice") {
    if (!isOwner) {
      return NextResponse.json({ error: "Only Super Admin can send ERP fee invoices." }, { status: 403 });
    }
    const billingCycle = String(body.billing_cycle || "monthly").trim();
    const periodLabel = String(body.period_label || "").trim();
    const grossIncomeRupees = Number(body.gross_income_rupees || 0);
    const feeBps = Number(body.fee_bps || 200);
    const notes = String(body.notes || "").trim();

    if (!periodLabel || Number.isNaN(grossIncomeRupees) || grossIncomeRupees < 0) {
      return NextResponse.json({ error: "Valid period label and gross income required." }, { status: 400 });
    }

    const grossPaise = Math.round(grossIncomeRupees * 100);
    const feePaise = Math.round((grossPaise * feeBps) / 10000);
    const invNum = `AVIT-ERP-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    const { error } = await db.from("cms_content").insert({
      section_path: "erp-fee-invoices",
      title: `ERP & Gateway Fee (${billingCycle}) — ${periodLabel}`,
      month_label: billingCycle,
      date_label: periodLabel,
      sort_order: feePaise,
      asset_number: invNum,
      description: JSON.stringify({
        gross_income_paise: grossPaise,
        fee_bps: feeBps,
        status: "unpaid",
        notes,
        payment_ref: "",
      }),
      media_type: "note",
      is_published: false,
      access_level: "premium",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, invoice_number: invNum });
  }

  if (body.action === "submit_invoice_payment" || body.action === "mark_invoice_status") {
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "Invoice id required." }, { status: 400 });

    const { data: existing, error: findErr } = await db
      .from("cms_content")
      .select("id, description")
      .eq("id", id)
      .eq("section_path", "erp-fee-invoices")
      .single();

    if (findErr || !existing) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(existing.description || "{}");
    } catch {
      meta = {};
    }

    if (body.action === "submit_invoice_payment") {
      const ref = String(body.payment_ref || "").trim();
      if (!ref) return NextResponse.json({ error: "Payment reference required." }, { status: 400 });
      meta.payment_ref = ref;
      meta.status = "submitted";
    } else {
      if (!isOwner) {
        return NextResponse.json({ error: "Only Super Admin can verify paid status." }, { status: 403 });
      }
      meta.status = body.status === "paid" ? "paid" : "unpaid";
    }

    const { error: updErr } = await db
      .from("cms_content")
      .update({
        description: JSON.stringify(meta),
        external_url: String(meta.payment_ref || "") || null,
      })
      .eq("id", id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown ERP action." }, { status: 400 });
}
