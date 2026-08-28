import { NextRequest, NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

const CHOICE_TYPES = new Set([
  "mcq_single","mcq_multiple","true_false","statement_based","assertion_reason","match_following","paragraph_based"
]);

async function validatePublish(testId: string) {
  const supabase = getMockTestAdminClient();

  const { data: maps, error } = await supabase
    .from("mock_test_questions")
    .select("question_id,mock_questions(id,question_type,verification_status,answer_text,answer_numeric)")
    .eq("test_id", testId);

  if (error) return { ok: false, message: error.message };
  if (!(maps ?? []).length) return { ok: false, message: "Add at least one question before publishing." };

  const questions = (maps ?? []).map((m: any) => Array.isArray(m.mock_questions) ? m.mock_questions[0] : m.mock_questions);
  const unverified = questions.filter((q: any) => q?.verification_status !== "verified");
  if (unverified.length) return { ok: false, message: `${unverified.length} question(s) still need verification before this test can be published.` };

  const choiceIds = questions.filter((q: any) => CHOICE_TYPES.has(q.question_type)).map((q: any) => q.id);
  if (choiceIds.length) {
    const { data: correct } = await supabase
      .from("mock_question_options")
      .select("question_id")
      .in("question_id", choiceIds)
      .eq("is_correct", true);

    const has = new Set((correct ?? []).map((x: any) => x.question_id));
    const missing = choiceIds.filter((id: string) => !has.has(id));
    if (missing.length) return { ok: false, message: `${missing.length} choice question(s) do not have a confirmed correct answer.` };
  }

  const missingTyped = questions.filter((q: any) =>
    (q.question_type === "fill_blank" && !String(q.answer_text || "").trim()) ||
    (q.question_type === "numeric_answer" && q.answer_numeric == null)
  );
  if (missingTyped.length) return { ok: false, message: `${missingTyped.length} typed/numeric question(s) do not have a confirmed answer.` };

  return { ok: true, message: "" };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { testId } = await context.params;
  const supabase = getMockTestAdminClient();

  const { data, error } = await supabase.from("mock_tests").select("*").eq("id", testId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ test: data });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { testId } = await context.params;
  const body = await req.json();

  if (body.status === "published") {
    const validation = await validatePublish(testId);
    if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 409 });
  }

  const allowed = [
    "title","description","exam_category","subject","test_type","duration_minutes","total_marks",
    "negative_marking","passing_marks","language","show_answers_after_submit","show_solutions",
    "access_type","status","randomize_questions","randomize_options","attempt_limit","starts_at","ends_at"
  ];

  const patch: Record<string, any> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  const supabase = getMockTestAdminClient();
  const { data, error } = await supabase.from("mock_tests").update(patch).eq("id", testId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ test: data });
}
