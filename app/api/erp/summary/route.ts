import { NextRequest, NextResponse } from "next/server";
import { canManageCourses } from "@/lib/course-admin";
import { canViewDirector } from "@/lib/director-access";
import { hasOwnerSession } from "@/lib/super-admin";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

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

export async function GET() {
  if (!(await canAccessErp())) {
    return NextResponse.json({ error: "Director, Admin, or Super Admin access required" }, { status: 403 });
  }

  const isOwner = await hasOwnerSession();
  const db = createCmsServiceClient();

  const [ordersRes, itemsRes, coursesRes, expensesRes, taxRes, platformRes, invoicesRes] = await Promise.all([
    db
      .from("course_purchase_orders")
      .select("id, course_id, buyer_name, buyer_email, amount_paise, status, created_at, paid_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    db
      .from("course_purchase_order_items")
      .select("order_id, course_id, title_snapshot, amount_paise")
      .limit(4000),
    db
      .from("courses")
      .select("id, title, slug")
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
      .from("cms_content")
      .select("id, title, month_label, date_label, sort_order, description, asset_number, external_url, created_at")
      .eq("section_path", "erp-fee-invoices")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (ordersRes.error || itemsRes.error || coursesRes.error || expensesRes.error || invoicesRes.error) {
    const errMsg =
      ordersRes.error?.message ||
      itemsRes.error?.message ||
      coursesRes.error?.message ||
      expensesRes.error?.message ||
      invoicesRes.error?.message ||
      "Unable to load ERP data.";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  const feeBps =
    typeof platformRes.data?.fee_bps === "number" && platformRes.data.fee_bps >= 0
      ? platformRes.data.fee_bps
      : 200; // Default 2.00%

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

  type PeriodBucket = {
    period: string;
    income_paise: number;
    expense_paise: number;
    erp_fee_paise: number;
    orders: number;
  };

  const dailyMap = new Map<string, PeriodBucket>();
  const weeklyMap = new Map<string, PeriodBucket>();
  const monthlyMap = new Map<string, PeriodBucket>();
  const yearlyMap = new Map<string, PeriodBucket>();

  const addIncomeToBucket = (map: Map<string, PeriodBucket>, key: string, amountPaise: number) => {
    const entry = map.get(key) || { period: key, income_paise: 0, expense_paise: 0, erp_fee_paise: 0, orders: 0 };
    entry.income_paise += amountPaise;
    entry.erp_fee_paise = Math.round((entry.income_paise * feeBps) / 10000);
    entry.orders += 1;
    map.set(key, entry);
  };

  const addExpenseToBucket = (map: Map<string, PeriodBucket>, key: string, amountPaise: number) => {
    const entry = map.get(key) || { period: key, income_paise: 0, expense_paise: 0, erp_fee_paise: 0, orders: 0 };
    entry.expense_paise += amountPaise;
    map.set(key, entry);
  };

  for (const order of paidOrders) {
    const dt = new Date(order.paid_at || order.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const amt = Number(order.amount_paise || 0);
    addIncomeToBucket(dailyMap, dt, amt);
    addIncomeToBucket(weeklyMap, getIsoWeekLabel(dt), amt);
    addIncomeToBucket(monthlyMap, dt.slice(0, 7), amt);
    addIncomeToBucket(yearlyMap, dt.slice(0, 4), amt);
  }

  for (const exp of expenses) {
    const dt = exp.expense_date.slice(0, 10);
    addExpenseToBucket(dailyMap, dt, exp.amount_paise);
    addExpenseToBucket(weeklyMap, getIsoWeekLabel(dt), exp.amount_paise);
    addExpenseToBucket(monthlyMap, dt.slice(0, 7), exp.amount_paise);
    addExpenseToBucket(yearlyMap, dt.slice(0, 4), exp.amount_paise);
  }

  const daily = [...dailyMap.values()].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 30);
  const weekly = [...weeklyMap.values()].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 26);
  const monthly = [...monthlyMap.values()].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 12);
  const yearly = [...yearlyMap.values()].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 10);

  // Top-selling courses / items by code
  const salesMap = new Map<
    string,
    { code: string; title: string; units: number; revenue_paise: number }
  >();
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
  const topSellers = [...salesMap.values()]
    .sort((a, b) => b.units - a.units || b.revenue_paise - a.revenue_paise)
    .slice(0, 15);

  const grossIncomePaise = paidOrders.reduce((sum, o) => sum + Number(o.amount_paise || 0), 0);
  const totalExpensesPaise = expenses.reduce((sum, e) => sum + e.amount_paise, 0);
  const baseRevenuePaise = Math.round(grossIncomePaise / (1 + gstPercent / 100));
  const gstAmountPaise = grossIncomePaise - baseRevenuePaise;
  const erpFeePaise = Math.round((grossIncomePaise * feeBps) / 10000);
  const netProfitPaise = grossIncomePaise - totalExpensesPaise;
  const netAfterErpFeePaise = netProfitPaise - erpFeePaise;

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
      summary: {
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
        pending_orders_count: orders.filter((o) => o.status === "pending").length,
      },
      daily,
      weekly,
      monthly,
      yearly,
      expenses,
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
