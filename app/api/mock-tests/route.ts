import { NextResponse } from "next/server";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import { requireStudent } from "@/lib/mock-test/student";
import { listAccessibleMockTests } from "@/lib/mock-test/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getMockTestAdminClient();
    const tests = await listAccessibleMockTests(user.id);
    const ids = tests.map((test: any) => test.id);

    const questionCounts = new Map<string, number>();
    if (ids.length) {
      const { data: mappings, error: mappingError } = await supabase
        .from("mock_test_questions")
        .select("test_id")
        .in("test_id", ids);

      if (mappingError) throw mappingError;
      for (const row of mappings ?? []) {
        questionCounts.set(row.test_id, (questionCounts.get(row.test_id) ?? 0) + 1);
      }
    }

    const attemptsByTest = new Map<string, any[]>();
    if (ids.length) {
      const { data: attempts, error: attemptsError } = await supabase
        .from("mock_attempts")
        .select("id,test_id,status,score,total_marks,percentage,accuracy,started_at,submitted_at,elapsed_seconds")
        .eq("student_id", user.id)
        .in("test_id", ids)
        .order("started_at", { ascending: false });

      if (attemptsError) throw attemptsError;

      for (const attempt of attempts ?? []) {
        const arr = attemptsByTest.get(attempt.test_id) ?? [];
        arr.push(attempt);
        attemptsByTest.set(attempt.test_id, arr);
      }
    }

    const now = Date.now();

    const enriched = tests.map((test: any) => {
      const attempts = attemptsByTest.get(test.id) ?? [];
      const inProgress = attempts.find((attempt: any) => attempt.status === "in_progress") ?? null;
      const submitted = attempts.filter((attempt: any) => attempt.status === "submitted");
      const latestSubmitted = submitted[0] ?? null;
      const attemptLimit = test.attempt_limit == null ? null : Number(test.attempt_limit);

      return {
        ...test,
        question_count: questionCounts.get(test.id) ?? 0,
        attempt_count: submitted.length,
        in_progress_attempt_id: inProgress?.id ?? null,
        last_attempt_id: latestSubmitted?.id ?? null,
        last_percentage: latestSubmitted?.percentage ?? null,
        can_retake: attemptLimit == null || submitted.length < attemptLimit,
        upcoming: Boolean(test.starts_at && new Date(test.starts_at).getTime() > now),
        expired: Boolean(test.ends_at && new Date(test.ends_at).getTime() < now),
      };
    });

    return NextResponse.json({ tests: enriched });
  } catch (error: any) {
    console.error("Mock Test dashboard API error:", error);
    return NextResponse.json({ error: error?.message || "Unable to load Mock Tests." }, { status: 500 });
  }
}
