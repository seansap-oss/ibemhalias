import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

export interface DashboardActivityItem {
  id: string;
  kind: "course" | "exam" | "mcq" | "payment" | "notification";
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  createdAt: string;
}

async function adminAllowed() {
  const store = await cookies();
  return Boolean(store.get("ibemhal_admin_session")?.value);
}

export async function GET() {
  if (!(await adminAllowed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getMockTestAdminClient();

  const [coursesRes, testsRes, questionsRes, ordersRes, notifRes] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id,title,is_published,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("mock_tests")
        .select("id,title,status,total_marks,exam_category,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("mock_questions")
        .select("id,question_text,exam,subject,verification_status,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("course_orders")
        .select("id,status,amount_paise,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("notifications")
        .select("id,title,channel,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const items: DashboardActivityItem[] = [];

  for (const c of coursesRes.data ?? []) {
    items.push({
      id: `course-${c.id}`,
      kind: "course",
      title: c.title || "Untitled Course",
      subtitle: "Course created",
      badge: c.is_published ? "Published" : "Draft",
      href: `/admin/courses/${c.id}`,
      createdAt: c.created_at || new Date().toISOString(),
    });
  }

  for (const t of testsRes.data ?? []) {
    items.push({
      id: `exam-${t.id}`,
      kind: "exam",
      title: t.title || "Online Exam",
      subtitle: `${t.exam_category || "Exam"} · ${t.total_marks || 0} marks`,
      badge: t.status || "draft",
      href: `/admin/mock-test/tests/${t.id}`,
      createdAt: t.created_at || new Date().toISOString(),
    });
  }

  for (const q of questionsRes.data ?? []) {
    const snippet = String(q.question_text || "").slice(0, 72);
    items.push({
      id: `mcq-${q.id}`,
      kind: "mcq",
      title: snippet + (String(q.question_text || "").length > 72 ? "…" : ""),
      subtitle: `MCQ · ${q.exam || "General"}${q.subject ? ` / ${q.subject}` : ""}`,
      badge: q.verification_status || "draft",
      href: "/admin/mock-test",
      createdAt: q.created_at || new Date().toISOString(),
    });
  }

  for (const o of ordersRes.data ?? []) {
    const rupees = Math.round(Number(o.amount_paise || 0) / 100);
    items.push({
      id: `pay-${o.id}`,
      kind: "payment",
      title: `Payment ₹${rupees.toLocaleString("en-IN")}`,
      subtitle: "Course fee / order",
      badge: o.status || "pending",
      href: "/admin/finance/payments",
      createdAt: o.created_at || new Date().toISOString(),
    });
  }

  for (const n of notifRes.data ?? []) {
    items.push({
      id: `notif-${n.id}`,
      kind: "notification",
      title: n.title || "Notification / Email",
      subtitle: `Channel: ${n.channel || "email"}`,
      badge: "Sent",
      href: "/admin/notifications",
      createdAt: n.created_at || new Date().toISOString(),
    });
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const aiConfigured = Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.GROQ_API_KEY
  );

  return NextResponse.json({
    ok: true,
    aiConfigured,
    items: items.slice(0, 15),
  });
}
