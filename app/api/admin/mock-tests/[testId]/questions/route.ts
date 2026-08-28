import { NextRequest, NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

export async function GET(_req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { testId } = await context.params;
  const supabase = getMockTestAdminClient();

  const { data: maps, error } = await supabase
    .from("mock_test_questions")
    .select("question_id,sort_order,section_id")
    .eq("test_id", testId)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (maps ?? []).map((m: any) => m.question_id);
  if (!ids.length) return NextResponse.json({ questions: [] });

  const { data: qs, error: qerr } = await supabase
    .from("mock_questions")
    .select("id,question_text,question_type,paragraph_text,explanation,exam,subject,topic,difficulty,marks,negative_marks,source,source_pdf,source_page,verification_status,answer_text,answer_numeric,answer_tolerance")
    .in("id", ids);

  if (qerr) return NextResponse.json({ error: qerr.message }, { status: 500 });

  const { data: opts, error: oerr } = await supabase
    .from("mock_question_options")
    .select("id,question_id,option_key,option_text,is_correct,sort_order")
    .in("question_id", ids)
    .order("sort_order");

  if (oerr) return NextResponse.json({ error: oerr.message }, { status: 500 });

  const optionMap = new Map<string, any[]>();
  for (const o of opts ?? []) {
    const arr = optionMap.get(o.question_id) ?? [];
    arr.push(o);
    optionMap.set(o.question_id, arr);
  }

  const by = new Map((qs ?? []).map((q: any) => [q.id, { ...q, options: optionMap.get(q.id) ?? [] }]));
  return NextResponse.json({
    questions: (maps ?? []).map((m: any) => ({ ...by.get(m.question_id), sort_order: m.sort_order, section_id: m.section_id })).filter(Boolean)
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { testId } = await context.params;
  const body = await req.json();
  const supabase = getMockTestAdminClient();

  const { data: q, error: qerr } = await supabase.from("mock_questions").insert({
    question_type: body.question_type || "mcq_single",
    question_text: String(body.question_text || ""),
    paragraph_text: body.paragraph_text || null,
    explanation: body.explanation || null,
    exam: body.exam || null,
    subject: body.subject || null,
    topic: body.topic || null,
    difficulty: body.difficulty || "medium",
    marks: Number(body.marks || 1),
    negative_marks: Number(body.negative_marks || 0),
    verification_status: body.verification_status || "verified",
    status: "active",
    answer_text: body.answer_text || null,
    answer_numeric: body.answer_numeric === "" || body.answer_numeric == null ? null : Number(body.answer_numeric),
    answer_tolerance: Number(body.answer_tolerance || 0),
  }).select("*").single();

  if (qerr || !q) return NextResponse.json({ error: qerr?.message || "Question create failed" }, { status: 500 });

  const opts = Array.isArray(body.options) ? body.options : [];
  if (opts.length) {
    const { error: oerr } = await supabase.from("mock_question_options").insert(opts.map((o: any, i: number) => ({
      question_id: q.id,
      option_key: o.option_key || String.fromCharCode(65 + i),
      option_text: String(o.option_text || ""),
      is_correct: Boolean(o.is_correct),
      sort_order: i + 1,
    })));
    if (oerr) return NextResponse.json({ error: oerr.message }, { status: 500 });
  }

  const { data: last } = await supabase.from("mock_test_questions")
    .select("sort_order").eq("test_id", testId).order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { error: merr } = await supabase.from("mock_test_questions").insert({
    test_id: testId,
    question_id: q.id,
    sort_order: Number(last?.sort_order || 0) + 1,
  });

  if (merr) return NextResponse.json({ error: merr.message }, { status: 500 });
  return NextResponse.json({ question: q }, { status: 201 });
}
