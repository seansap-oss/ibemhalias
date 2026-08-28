import { createClient } from "@supabase/supabase-js";

export function getMockTestAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment is not configured.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export type PublicQuestion = {
  id: string;
  question_type: string;
  question_text: string;
  paragraph_text: string | null;
  marks: number;
  negative_marks: number;
  section_id: string | null;
  section_title: string | null;
  options: { id: string; option_key: string; option_text: string }[];
};

export async function getPublishedTest(testId: string) {
  const supabase = getMockTestAdminClient();

  const { data: test, error } = await supabase
    .from("mock_tests")
    .select("*")
    .eq("id", testId)
    .eq("status", "published")
    .single();

  if (error || !test) return null;

  const { data: mappings, error: mapError } = await supabase
    .from("mock_test_questions")
    .select("id,section_id,sort_order,marks_override,negative_marks_override,question_id,mock_questions(id,question_type,question_text,paragraph_text,marks,negative_marks),mock_test_sections(title)")
    .eq("test_id", testId)
    .order("sort_order");

  if (mapError) throw mapError;

  const questionIds = (mappings ?? []).map((m: any) => m.question_id);

  const { data: options, error: optionError } = questionIds.length
    ? await supabase
        .from("mock_question_options")
        .select("id,question_id,option_key,option_text,sort_order")
        .in("question_id", questionIds)
        .order("sort_order")
    : { data: [], error: null };

  if (optionError) throw optionError;

  const byQuestion = new Map<string, any[]>();
  for (const option of options ?? []) {
    const arr = byQuestion.get(option.question_id) ?? [];
    arr.push({
      id: option.id,
      option_key: option.option_key,
      option_text: option.option_text,
    });
    byQuestion.set(option.question_id, arr);
  }

  const questions: PublicQuestion[] = (mappings ?? []).map((m: any) => {
    const q = Array.isArray(m.mock_questions) ? m.mock_questions[0] : m.mock_questions;
    const sec = Array.isArray(m.mock_test_sections) ? m.mock_test_sections[0] : m.mock_test_sections;
    return {
      id: q.id,
      question_type: q.question_type,
      question_text: q.question_text,
      paragraph_text: q.paragraph_text ?? null,
      marks: Number(m.marks_override ?? q.marks ?? 1),
      negative_marks: Number(m.negative_marks_override ?? q.negative_marks ?? 0),
      section_id: m.section_id,
      section_title: sec?.title ?? null,
      options: byQuestion.get(q.id) ?? [],
    };
  });

  return { test, questions };
}
