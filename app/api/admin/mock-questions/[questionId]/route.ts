import { NextRequest, NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

export async function PATCH(req: NextRequest, context: { params: Promise<{ questionId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { questionId } = await context.params;
  const body = await req.json();
  const supabase = getMockTestAdminClient();

  const patch: Record<string, any> = {
    question_type: body.question_type,
    question_text: body.question_text,
    paragraph_text: body.paragraph_text || null,
    explanation: body.explanation || null,
    exam: body.exam || null,
    subject: body.subject || null,
    topic: body.topic || null,
    difficulty: body.difficulty || "medium",
    marks: Number(body.marks || 1),
    negative_marks: Number(body.negative_marks || 0),
    verification_status: body.verification_status || "needs_verification",
    answer_text: body.answer_text || null,
    answer_numeric: body.answer_numeric === "" || body.answer_numeric == null ? null : Number(body.answer_numeric),
    answer_tolerance: Number(body.answer_tolerance || 0),
  };

  const { data, error } = await supabase.from("mock_questions").update(patch).eq("id", questionId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(body.options)) {
    await supabase.from("mock_question_options").delete().eq("question_id", questionId);
    const options = body.options.filter((o: any) => String(o.option_text || "").trim());
    if (options.length) {
      const { error: oerr } = await supabase.from("mock_question_options").insert(options.map((o: any, i: number) => ({
        question_id: questionId,
        option_key: o.option_key || String.fromCharCode(65 + i),
        option_text: String(o.option_text),
        is_correct: Boolean(o.is_correct),
        sort_order: i + 1,
      })));
      if (oerr) return NextResponse.json({ error: oerr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ question: data });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ questionId: string }> }) {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { questionId } = await context.params;
  const supabase = getMockTestAdminClient();

  const { error: mapErr } = await supabase.from("mock_test_questions").delete().eq("question_id", questionId);
  if (mapErr) return NextResponse.json({ error: mapErr.message }, { status: 500 });

  const { error } = await supabase.from("mock_questions").delete().eq("id", questionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
