import { NextRequest, NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import { insertImportedQuestions } from "@/lib/mock-test/import-db";
import type { ImportedQuestion } from "@/lib/mock-test/importers";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

export async function POST(req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { testId } = await context.params;
  const body = await req.json();
  const questions = Array.isArray(body.questions) ? body.questions.filter((q: any) => q.selected !== false) : [];

  if (!questions.length) return NextResponse.json({ error: "Select at least one question to import." }, { status: 400 });
  if (questions.length > 100) return NextResponse.json({ error: "Import up to 100 questions at a time." }, { status: 400 });

  const normalized: ImportedQuestion[] = questions.map((q: any) => ({
    question_type: String(q.question_type || "mcq_single"),
    question_text: String(q.question_text || "").trim(),
    paragraph_text: q.paragraph_text ? String(q.paragraph_text) : null,
    explanation: q.explanation ? String(q.explanation) : null,
    exam: q.exam ? String(q.exam) : null,
    subject: q.subject ? String(q.subject) : null,
    topic: q.topic ? String(q.topic) : null,
    difficulty: q.difficulty ? String(q.difficulty) : "medium",
    marks: Number(q.marks || 1),
    negative_marks: Number(q.negative_marks || 0),
    source: q.source ? String(q.source) : "Smart import",
    source_pdf: q.source_pdf ? String(q.source_pdf) : null,
    source_page: q.source_page == null ? null : Number(q.source_page),
    verification_status: q.verification_status === "verified" ? "verified" : "needs_verification",
    answer_text: q.answer_text ? String(q.answer_text) : null,
    answer_numeric: q.answer_numeric == null || q.answer_numeric === "" ? null : Number(q.answer_numeric),
    answer_tolerance: Number(q.answer_tolerance || 0),
    options: Array.isArray(q.options)
      ? q.options
          .filter((o: any) => String(o.option_text || "").trim())
          .map((o: any, i: number) => ({
            option_key: String(o.option_key || String.fromCharCode(65 + i)).toUpperCase(),
            option_text: String(o.option_text || "").trim(),
            is_correct: Boolean(o.is_correct),
            sort_order: i + 1,
          }))
      : [],
  })).filter((q: ImportedQuestion) => q.question_text);

  if (!normalized.length) return NextResponse.json({ error: "No valid questions remain after validation." }, { status: 422 });

  const supabase = getMockTestAdminClient();
  const sourceName = String(body.sourceName || "Smart import");
  const importMode = String(body.mode || "existing");

  const { data: job } = await supabase.from("mock_question_import_jobs").insert({
    source_filename: sourceName,
    test_id: testId,
    import_type: importMode === "generate" ? "ai_generate" : "smart_existing",
    status: "processing",
    metadata: { preview_count: normalized.length },
  }).select("id").single();

  const result = await insertImportedQuestions(testId, normalized);

  if (job?.id) {
    await supabase.from("mock_question_import_jobs").update({
      status: result.errors.length ? "completed_with_errors" : "completed",
      imported_count: result.imported,
      needs_verification_count: result.needsVerification,
      error_message: result.errors.slice(0, 10).join("\n") || null,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
  }

  return NextResponse.json({
    ok: true,
    imported: result.imported,
    needsVerification: result.needsVerification,
    errors: result.errors.slice(0, 10),
  });
}
