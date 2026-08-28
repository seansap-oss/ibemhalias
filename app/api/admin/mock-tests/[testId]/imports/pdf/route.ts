import { NextRequest, NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import { extractPdfPages, parseStructuredPdfPages, tryExistingAiDraft } from "@/lib/mock-test/importers";
import { insertImportedQuestions } from "@/lib/mock-test/import-db";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { testId } = await context.params;
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 415 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "PDF is too large (25 MB max)." }, { status: 413 });

  const supabase = getMockTestAdminClient();
  const { data: job } = await supabase.from("mock_question_import_jobs").insert({
    source_filename: file.name,
    test_id: testId,
    import_type: "pdf",
    status: "processing",
    metadata: { size: file.size },
  }).select("id").single();

  try {
    const buffer = await file.arrayBuffer();
    const { pages, pageCount } = await extractPdfPages(buffer);
    const fullText = pages.map(p => p.text).join("\n\n");

    let questions = parseStructuredPdfPages(pages, file.name);
    let usedAi = false;

    if (questions.length < 2 && fullText.trim().length > 250) {
      const aiQuestions = await tryExistingAiDraft(fullText, file.name, 40);
      if (aiQuestions.length) {
        questions = aiQuestions;
        usedAi = true;
      }
    }

    if (!questions.length) {
      const message = fullText.trim().length < 100
        ? "The PDF contains little or no extractable text. It is probably scanned/image-based and needs OCR."
        : "Text was extracted, but no structured questions could be identified and the configured AI providers did not return a draft.";

      if (job?.id) {
        await supabase.from("mock_question_import_jobs").update({
          status: "failed",
          source_page_count: pageCount,
          extracted_text: fullText.slice(0, 100000),
          error_message: message,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
      }

      return NextResponse.json({ error: message, pageCount }, { status: 422 });
    }

    const result = await insertImportedQuestions(testId, questions);

    if (job?.id) {
      await supabase.from("mock_question_import_jobs").update({
        status: result.errors.length ? "completed_with_errors" : "completed",
        source_page_count: pageCount,
        extracted_text: fullText.slice(0, 100000),
        imported_count: result.imported,
        needs_verification_count: result.needsVerification,
        error_message: result.errors.slice(0, 10).join("\n") || null,
        metadata: { size: file.size, used_ai: usedAi },
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
    }

    return NextResponse.json({
      ok: true,
      pageCount,
      parsed: questions.length,
      imported: result.imported,
      needsVerification: result.needsVerification,
      usedAi,
      errors: result.errors.slice(0, 10),
    });
  } catch (err: any) {
    const message = err?.message || "PDF import failed.";
    if (job?.id) {
      await supabase.from("mock_question_import_jobs").update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
