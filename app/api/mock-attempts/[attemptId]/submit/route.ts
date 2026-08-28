import { NextRequest, NextResponse } from "next/server";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import { requireStudent } from "@/lib/mock-test/student";

function normalizeText(v: any) {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(_req: NextRequest, context: { params: Promise<{ attemptId: string }> }) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attemptId } = await context.params;
  const supabase = getMockTestAdminClient();

  const { data: attempt, error: attemptError } = await supabase
    .from("mock_attempts")
    .select("*, mock_tests(id,duration_minutes,total_marks,show_answers_after_submit,show_solutions)")
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .single();

  if (attemptError || !attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status === "submitted") return NextResponse.json({ attemptId, alreadySubmitted: true });

  const { data: mappings, error: mapError } = await supabase
    .from("mock_test_questions")
    .select("question_id,marks_override,negative_marks_override,mock_questions(id,question_type,marks,negative_marks,answer_text,answer_numeric,answer_tolerance)")
    .eq("test_id", attempt.test_id);

  if (mapError) return NextResponse.json({ error: mapError.message }, { status: 500 });

  const questionIds = (mappings ?? []).map((m: any) => m.question_id);

  const { data: correctOptions, error: keyError } = questionIds.length
    ? await supabase
        .from("mock_question_options")
        .select("id,question_id,is_correct")
        .in("question_id", questionIds)
    : { data: [], error: null };

  if (keyError) return NextResponse.json({ error: keyError.message }, { status: 500 });

  const { data: answers, error: answerError } = await supabase
    .from("mock_attempt_answers")
    .select("*")
    .eq("attempt_id", attemptId);

  if (answerError) return NextResponse.json({ error: answerError.message }, { status: 500 });

  const answerMap = new Map((answers ?? []).map((a: any) => [a.question_id, a]));
  const correctMap = new Map<string, Set<string>>();

  for (const row of correctOptions ?? []) {
    if (!row.is_correct) continue;
    const set = correctMap.get(row.question_id) ?? new Set<string>();
    set.add(row.id);
    correctMap.set(row.question_id, set);
  }

  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;

  for (const m of mappings ?? []) {
    const q: any = Array.isArray((m as any).mock_questions) ? (m as any).mock_questions[0] : (m as any).mock_questions;
    const marks = Number((m as any).marks_override ?? q?.marks ?? 1);
    const negative = Number((m as any).negative_marks_override ?? q?.negative_marks ?? 0);
    const answer: any = answerMap.get((m as any).question_id);

    let attempted = false;
    let isCorrect = false;

    if (q?.question_type === "fill_blank") {
      const actual = normalizeText(answer?.text_answer);
      attempted = Boolean(actual);
      const accepted = String(q?.answer_text ?? "").split("|").map(normalizeText).filter(Boolean);
      isCorrect = attempted && accepted.includes(actual);
    } else if (q?.question_type === "numeric_answer") {
      attempted = answer?.numeric_answer != null && Number.isFinite(Number(answer.numeric_answer));
      const expected = Number(q?.answer_numeric);
      const actual = Number(answer?.numeric_answer);
      const tolerance = Math.max(0, Number(q?.answer_tolerance ?? 0));
      isCorrect = attempted && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance;
    } else {
      const selected = new Set<string>(answer?.selected_option_ids ?? []);
      const expected = correctMap.get((m as any).question_id) ?? new Set<string>();
      attempted = selected.size > 0;
      isCorrect = attempted && selected.size === expected.size && [...selected].every(id => expected.has(id));
    }

    if (!attempted) {
      unattempted++;
      if (answer) await supabase.from("mock_attempt_answers").update({ awarded_marks: 0 }).eq("id", answer.id);
      continue;
    }

    const awarded = isCorrect ? marks : -negative;
    score += awarded;
    if (isCorrect) correct++;
    else incorrect++;

    if (answer) {
      await supabase.from("mock_attempt_answers").update({ awarded_marks: awarded }).eq("id", answer.id);
    }
  }

  const total = Number(attempt.mock_tests?.total_marks ?? attempt.total_marks ?? 0);
  const attemptedCount = correct + incorrect;
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const accuracy = attemptedCount > 0 ? (correct / attemptedCount) * 100 : 0;

  const submittedAt = new Date();
  const startedAt = new Date(attempt.started_at);
  const elapsed = Math.max(0, Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000));

  const { error: updateError } = await supabase
    .from("mock_attempts")
    .update({
      status: "submitted",
      submitted_at: submittedAt.toISOString(),
      elapsed_seconds: elapsed,
      score,
      total_marks: total,
      percentage,
      accuracy,
      correct_count: correct,
      incorrect_count: incorrect,
      unattempted_count: unattempted,
      last_saved_at: submittedAt.toISOString(),
    })
    .eq("id", attemptId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    attemptId,
    score,
    total,
    percentage,
    accuracy,
    correct,
    incorrect,
    unattempted,
    elapsedSeconds: elapsed,
  });
}
