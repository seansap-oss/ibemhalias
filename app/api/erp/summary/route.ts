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

export async function GET() {
  if (!(await canAccessErp())) {
    return NextResponse.json({ error: "Director, Admin, or Super Admin access required" }, { status: 403 });
  }

  const db = createCmsServiceClient();

  const [ordersRes, itemsRes, coursesRes, expensesRes, taxRes] = await Promise.all([
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
      .select("id, title, slug, price_paise")
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
  ]);

  if (ordersRes.error || itemsRes.error || coursesRes.error || expensesRes.error) {
    return NextResponse.json({ error: "Unable to load ERP data." }, { status: 500 });
  }

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

  // Daily breakdown (IST)
  const dailyMap = new Map<string, { date: string; income_paise: number; expense_paise: number; orders: number }>();
  for (const order of paidOrders) {
    const dt = new Date(order.paid_at || order.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const entry = dailyMap.get(dt) || { date: dt, income_paise: 0, expense_paise: 0, orders: 0 };
    entry.income_paise += Number(order.amount_paise || 0);
    entry.orders += 1;
    dailyMap.set(dt, entry);
  }
  for (const exp of expenses) {
    const dt = exp.expense_date.slice(0, 10);
    const entry = dailyMap.get(dt) || { date: dt, income_paise: 0, expense_paise: 0, orders: 0 };
    entry.expense_paise += exp.amount_paise;
    dailyMap.set(dt, entry);
  }
  const daily = [...dailyMap.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  // Monthly breakdown (IST)
  const monthlyMap = new Map<string, { month: string; income_paise: number; expense_paise: number; orders: number }>();
  for (const order of paidOrders) {
    const m = new Date(order.paid_at || order.created_at)
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      .slice(0, 7);
    const entry = monthlyMap.get(m) || { month: m, income_paise: 0, expense_paise: 0, orders: 0 };
    entry.income_paise += Number(order.amount_paise || 0);
    entry.orders += 1;
    monthlyMap.set(m, entry);
  }
  for (const exp of expenses) {
    const m = exp.expense_date.slice(0, 7);
    const entry = monthlyMap.get(m) || { month: m, income_paise: 0, expense_paise: 0, orders: 0 };
    entry.expense_paise += exp.amount_paise;
    monthlyMap.set(m, entry);
  }
  const monthly = [...monthlyMap.values()].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);

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
  const netProfitPaise = grossIncomePaise - totalExpensesPaise;

  return NextResponse.json(
    {
      summary: {
        gross_income_paise: grossIncomePaise,
        base_revenue_paise: baseRevenuePaise,
        gst_percent: gstPercent,
        gst_amount_paise: gstAmountPaise,
        total_expenses_paise: totalExpensesPaise,
        net_profit_paise: netProfitPaise,
        paid_orders_count: paidOrders.length,
        pending_orders_count: orders.filter((o) => o.status === "pending").length,
      },
      daily,
      monthly,
      expenses,
      topSellers,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(request: NextRequest) {
  if (!(await canAccessErp())) {
    return NextResponse.json({ error: "Director, Admin, or Super Admin access required" }, { status: 403 });
  }

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

  return NextResponse.json({ error: "Unknown ERP action." }, { status: 400 });
}
