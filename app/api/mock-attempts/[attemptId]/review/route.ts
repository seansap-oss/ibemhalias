import { NextResponse } from "next/server";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import { requireStudent } from "@/lib/mock-test/student";

export async function GET(_req: Request, context: { params: Promise<{ attemptId: string }> }) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attemptId } = await context.params;
  const supabase = getMockTestAdminClient();

  const { data: attempt } = await supabase
    .from("mock_attempts")
    .select("id,test_id,status,student_id,mock_tests(show_answers_after_submit,show_solutions)")
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .single();

  if (!attempt || attempt.status !== "submitted") {
    return NextResponse.json({ error: "Review unavailable" }, { status: 409 });
  }

  const settings: any = Array.isArray((attempt as any).mock_tests)
    ? (attempt as any).mock_tests[0]
    : (attempt as any).mock_tests;

  if (!settings?.show_answers_after_submit) {
    return NextResponse.json({ error: "Answers are hidden for this test" }, { status: 403 });
  }

  const { data: mappings, error } = await supabase
    .from("mock_test_questions")
    .select("sort_order,question_id,mock_questions(id,question_type,question_text,paragraph_text,explanation,source,source_page,answer_text,answer_numeric,answer_tolerance,mock_question_options(id,option_key,option_text,is_correct,sort_order))")
    .eq("test_id", attempt.test_id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: answers } = await supabase
    .from("mock_attempt_answers")
    .select("question_id,selected_option_ids,numeric_answer,text_answer,awarded_marks,marked_for_review")
    .eq("attempt_id", attemptId);

  return NextResponse.json({
    showSolutions: Boolean(settings?.show_solutions),
    questions: mappings ?? [],
    answers: answers ?? [],
  });
}
