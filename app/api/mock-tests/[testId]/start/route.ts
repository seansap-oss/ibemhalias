import { NextRequest, NextResponse } from "next/server";
import { getMockTestAdminClient, getPublishedTest } from "@/lib/mock-test/server";
import { requireStudent } from "@/lib/mock-test/student";
import { getMockTestAccessDecision } from "@/lib/mock-test/access";

function accessMessage(reason: string) {
  if (reason === "not_started") return "This Mock Test has not opened yet.";
  if (reason === "expired") return "This Mock Test has expired.";
  if (reason === "not_assigned") return "This Mock Test is not assigned to your student account.";
  return "You do not have access to this Mock Test.";
}

export async function POST(_req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { testId } = await context.params;
  const decision = await getMockTestAccessDecision(testId, user.id);

  if (!decision.allowed) {
    const status = decision.reason === "expired" ? 410 : decision.reason === "not_started" ? 423 : 403;
    return NextResponse.json({ error: accessMessage(decision.reason) }, { status });
  }

  const payload = await getPublishedTest(testId);
  if (!payload) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const supabase = getMockTestAdminClient();

  const { data: existing } = await supabase
    .from("mock_attempts")
    .select("*")
    .eq("test_id", testId)
    .eq("student_id", user.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let attempt = existing;

  if (!attempt) {
    if (decision.test?.attempt_limit != null) {
      const { count, error: countError } = await supabase
        .from("mock_attempts")
        .select("id", { count: "exact", head: true })
        .eq("test_id", testId)
        .eq("student_id", user.id)
        .eq("status", "submitted");

      if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

      if (Number(count || 0) >= Number(decision.test.attempt_limit)) {
        return NextResponse.json({ error: "You have reached the attempt limit for this Mock Test." }, { status: 409 });
      }
    }

    const questionOrder = payload.questions.map((question) => question.id);

    const { data, error } = await supabase
      .from("mock_attempts")
      .insert({
        test_id: testId,
        student_id: user.id,
        total_marks: payload.test.total_marks,
        question_order: questionOrder,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    attempt = data;
  }

  const { data: savedAnswers } = await supabase
    .from("mock_attempt_answers")
    .select("question_id,selected_option_ids,numeric_answer,text_answer,marked_for_review,time_spent_seconds")
    .eq("attempt_id", attempt.id);

  return NextResponse.json({
    attempt,
    test: {
      id: payload.test.id,
      title: payload.test.title,
      duration_minutes: payload.test.duration_minutes,
      total_marks: payload.test.total_marks,
      language: payload.test.language,
    },
    questions: payload.questions,
    savedAnswers: savedAnswers ?? [],
  });
}
