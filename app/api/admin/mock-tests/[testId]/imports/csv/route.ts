import { NextRequest, NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import { parseCsv, csvRowsToQuestions } from "@/lib/mock-test/importers";
import { insertImportedQuestions } from "@/lib/mock-test/import-db";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { testId } = await context.params;
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return NextResponse.json({ error: "CSV file required" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "CSV is too large (10 MB max)." }, { status: 413 });

  const text = await file.text();
  const rows = parseCsv(text);
  const questions = csvRowsToQuestions(rows, file.name);

  if (!questions.length) {
    return NextResponse.json({
      error: "No questions found. Required column: question. Recommended: option_a, option_b, option_c, option_d, correct_answer."
    }, { status: 422 });
  }

  const supabase = getMockTestAdminClient();
  const { data: job } = await supabase.from("mock_question_import_jobs").insert({
    source_filename: file.name,
    test_id: testId,
    import_type: "csv",
    status: "processing",
    metadata: { row_count: rows.length },
  }).select("id").single();

  const result = await insertImportedQuestions(testId, questions);

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
    parsed: questions.length,
    imported: result.imported,
    needsVerification: result.needsVerification,
    errors: result.errors.slice(0, 10),
  });
}
