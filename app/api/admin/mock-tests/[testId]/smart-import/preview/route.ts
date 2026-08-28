import { NextRequest, NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import {
  aiGenerateQuestions,
  aiParseExistingQuestions,
  extractUploadedText,
  parseExistingQuestions,
  type SmartImportSettings,
} from "@/lib/mock-test/smart-import";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest, context: { params: Promise<{ testId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await context.params;

  try {
    const form = await req.formData();
    const fileValue = form.get("file");
    const pastedText = String(form.get("pastedText") || "");
    const mode = String(form.get("mode") || "existing") === "generate" ? "generate" : "existing";
    const count = Math.max(1, Math.min(50, Number(form.get("count") || 10)));

    const settings: SmartImportSettings = {
      mode,
      count,
      questionType: String(form.get("questionType") || "mcq_single"),
      difficulty: String(form.get("difficulty") || "medium"),
      optionCount: Math.max(2, Math.min(6, Number(form.get("optionCount") || 4))),
      marks: Number(form.get("marks") || 1),
      negativeMarks: Number(form.get("negativeMarks") || 0),
      language: String(form.get("language") || "English"),
      exam: String(form.get("exam") || "") || undefined,
      subject: String(form.get("subject") || "") || undefined,
      topic: String(form.get("topic") || "") || undefined,
    };

    let sourceText = pastedText.trim();
    let sourceName = "Pasted text";
    let sourceKind = "pasted";
    let pageCount: number | null = null;

    if (fileValue instanceof File && fileValue.size > 0) {
      if (fileValue.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: "File is too large. Maximum supported size is 25 MB." }, { status: 413 });
      }
      const extracted = await extractUploadedText(fileValue);
      sourceText = extracted.text.trim();
      sourceName = fileValue.name;
      sourceKind = extracted.kind;
      pageCount = extracted.pages;
    }

    if (!sourceText) {
      return NextResponse.json({ error: "Upload a file or paste text before analysing." }, { status: 400 });
    }

    if (sourceText.length < 20) {
      return NextResponse.json({ error: "The supplied source does not contain enough readable text." }, { status: 422 });
    }

    if (mode === "generate") {
      const generated = await aiGenerateQuestions(sourceText, sourceName, settings);
      if (!generated.questions.length) {
        return NextResponse.json({ error: "The AI provider did not generate any usable questions from this source." }, { status: 422 });
      }

      return NextResponse.json({
        ok: true,
        mode,
        sourceName,
        sourceKind,
        pageCount,
        characterCount: sourceText.length,
        servedBy: generated.servedBy,
        questions: generated.questions,
      });
    }

    let questions = parseExistingQuestions(sourceText, sourceName, settings);
    let servedBy: string | null = null;
    let usedAiParser = false;

    if (questions.length === 0) {
      const parsed = await aiParseExistingQuestions(sourceText, sourceName, settings);
      questions = parsed.questions;
      servedBy = parsed.servedBy;
      usedAiParser = true;
    }

    if (!questions.length) {
      return NextResponse.json({
        error: "No existing questions were detected. If this is study material rather than prepared questions, switch to Generate from Content."
      }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      mode,
      sourceName,
      sourceKind,
      pageCount,
      characterCount: sourceText.length,
      servedBy,
      usedAiParser,
      questions,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || "Smart import failed."
    }, { status: 500 });
  }
}
