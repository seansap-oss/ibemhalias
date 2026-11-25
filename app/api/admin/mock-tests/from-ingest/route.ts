import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

interface IngestQuestionInput {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: string;
  topic?: string;
}

async function adminAllowed() {
  const store = await cookies();
  return Boolean(store.get("ibemhal_admin_session")?.value);
}

export async function POST(req: NextRequest) {
  if (!(await adminAllowed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const title = String(body.title || "AI Generated Online Exam").trim();
    const examCategory = String(body.exam_category || "UPSC").trim();
    const subject = String(body.subject || "General Studies").trim();
    const durationMinutes = Math.max(5, Number(body.duration_minutes || 30));
    const negativeMarking = Math.max(0, Number(body.negative_marking ?? 0.33));
    const passingMarks = Math.max(0, Number(body.passing_marks ?? 0));
    const publishImmediately = body.publishImmediately !== false;
    const questions = Array.isArray(body.questions)
      ? (body.questions as IngestQuestionInput[])
      : [];

    if (!questions.length) {
      return NextResponse.json(
        { error: "At least one MCQ is required to create an exam." },
        { status: 400 }
      );
    }

    const supabase = getMockTestAdminClient();
    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "exam";

    const totalMarks = questions.length;
    const { data: test, error: testError } = await supabase
      .from("mock_tests")
      .insert({
        title,
        slug: `${slugBase}-${Date.now()}`,
        description: body.description || "Created via AI Online Exam Maker",
        exam_category: examCategory,
        subject,
        test_type: "topic_test",
        duration_minutes: durationMinutes,
        total_marks: totalMarks,
        negative_marking: negativeMarking,
        passing_marks: passingMarks,
        language: "English",
        show_answers_after_submit: true,
        show_solutions: true,
        status: publishImmediately ? "published" : "draft",
      })
      .select("*")
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: testError?.message || "Failed to create exam." },
        { status: 500 }
      );
    }

    const createdQuestionIds: string[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const normalizedDiff = ["easy", "medium", "hard"].includes(
        String(q.difficulty || "").toLowerCase()
      )
        ? String(q.difficulty).toLowerCase()
        : "medium";

      const { data: qRow, error: qError } = await supabase
        .from("mock_questions")
        .insert({
          question_text: String(q.question || "").trim(),
          question_type: "mcq_single",
          exam: examCategory,
          subject,
          topic: q.topic || subject,
          difficulty: normalizedDiff,
          explanation: q.explanation || null,
          verification_status: "verified",
          marks: 1,
          negative_marks: negativeMarking,
        })
        .select("id")
        .single();

      if (qError || !qRow) continue;

      createdQuestionIds.push(qRow.id);

      const options = Array.isArray(q.options) ? q.options : [];
      if (options.length) {
        await supabase.from("mock_question_options").insert(
          options.map((optText, optIndex) => ({
            question_id: qRow.id,
            option_label: String.fromCharCode(65 + optIndex),
            option_text: String(optText),
            is_correct: optIndex === Number(q.correctIndex),
            sort_order: optIndex + 1,
          }))
        );
      }

      await supabase.from("mock_test_questions").insert({
        test_id: test.id,
        question_id: qRow.id,
        sort_order: i + 1,
        marks: 1,
      });
    }

    return NextResponse.json(
      {
        success: true,
        test,
        questionCount: createdQuestionIds.length,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to publish online exam",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
