import { NextRequest, NextResponse } from "next/server";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import { requireStudent } from "@/lib/mock-test/student";

export async function PUT(req: NextRequest, context: { params: Promise<{ attemptId: string }> }) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attemptId } = await context.params;
  const body = await req.json();
  const questionId = String(body.questionId || "");
  if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

  const supabase = getMockTestAdminClient();

  const { data: attempt } = await supabase
    .from("mock_attempts")
    .select("id,status,student_id")
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .single();

  if (!attempt || attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Attempt is not editable" }, { status: 409 });
  }

  const selectedOptionIds = Array.isArray(body.selectedOptionIds)
    ? body.selectedOptionIds.map(String)
    : [];

  const numericAnswer = body.numericAnswer === "" || body.numericAnswer == null
    ? null
    : Number(body.numericAnswer);

  const textAnswer = body.textAnswer == null ? null : String(body.textAnswer);

  const { error } = await supabase
    .from("mock_attempt_answers")
    .upsert({
      attempt_id: attemptId,
      question_id: questionId,
      selected_option_ids: selectedOptionIds,
      numeric_answer: Number.isFinite(numericAnswer as number) ? numericAnswer : null,
      text_answer: textAnswer,
      marked_for_review: Boolean(body.markedForReview),
      time_spent_seconds: Number(body.timeSpentSeconds || 0),
      updated_at: new Date().toISOString(),
    }, { onConflict: "attempt_id,question_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("mock_attempts")
    .update({ last_saved_at: new Date().toISOString() })
    .eq("id", attemptId);

  return NextResponse.json({ ok: true });
}
