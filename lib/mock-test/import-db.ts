import { getMockTestAdminClient } from "./server";
import type { ImportedQuestion } from "./importers";

export async function insertImportedQuestions(
  testId: string,
  questions: ImportedQuestion[]
) {
  const supabase = getMockTestAdminClient();

  const { data: last } = await supabase
    .from("mock_test_questions")
    .select("sort_order")
    .eq("test_id", testId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let order = Number(last?.sort_order || 0);
  let imported = 0;
  let needsVerification = 0;
  const errors: string[] = [];

  for (const item of questions) {
    try {
      const { data: q, error: qerr } = await supabase
        .from("mock_questions")
        .insert({
          question_type: item.question_type,
          question_text: item.question_text,
          paragraph_text: item.paragraph_text ?? null,
          explanation: item.explanation ?? null,
          exam: item.exam ?? null,
          subject: item.subject ?? null,
          topic: item.topic ?? null,
          difficulty: item.difficulty ?? "medium",
          marks: item.marks,
          negative_marks: item.negative_marks,
          source: item.source ?? null,
          source_pdf: item.source_pdf ?? null,
          source_page: item.source_page ?? null,
          verification_status: item.verification_status,
          status: "active",
          answer_text: item.answer_text ?? null,
          answer_numeric: item.answer_numeric ?? null,
          answer_tolerance: item.answer_tolerance ?? 0,
        })
        .select("*")
        .single();

      if (qerr || !q) throw new Error(qerr?.message || "Question insert failed");

      if (item.options.length) {
        const { error: oerr } = await supabase
          .from("mock_question_options")
          .insert(item.options.map(o => ({
            question_id: q.id,
            option_key: o.option_key,
            option_text: o.option_text,
            is_correct: o.is_correct,
            sort_order: o.sort_order,
          })));
        if (oerr) throw new Error(oerr.message);
      }

      order += 1;
      const { error: merr } = await supabase
        .from("mock_test_questions")
        .insert({
          test_id: testId,
          question_id: q.id,
          sort_order: order,
        });
      if (merr) throw new Error(merr.message);

      imported++;
      if (item.verification_status !== "verified") needsVerification++;
    } catch (err: any) {
      errors.push(err?.message || String(err));
    }
  }

  return { imported, needsVerification, errors };
}
