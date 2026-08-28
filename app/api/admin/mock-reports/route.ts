import { NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

export async function GET() {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getMockTestAdminClient();

  const { data: tests, error: testError } = await supabase
    .from("mock_tests")
    .select("id,title,exam_category,passing_marks,status")
    .order("created_at", { ascending: false });

  if (testError) return NextResponse.json({ error: testError.message }, { status: 500 });

  const { data: attempts, error: attemptError } = await supabase
    .from("mock_attempts")
    .select("test_id,score,total_marks,percentage,accuracy,elapsed_seconds,status")
    .eq("status", "submitted");

  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 500 });

  const reports = (tests ?? []).map((test: any) => {
    const rows = (attempts ?? []).filter((a: any) => a.test_id === test.id);
    const pct = rows.map((a: any) => Number(a.percentage || 0));
    const avg = pct.length ? pct.reduce((a: number, b: number) => a + b, 0) / pct.length : 0;
    const best = pct.length ? Math.max(...pct) : 0;
    const avgAccuracy = rows.length ? rows.reduce((n: number, a: any) => n + Number(a.accuracy || 0), 0) / rows.length : 0;
    const passLine = Number(test.passing_marks || 0);
    const passed = rows.filter((a: any) => Number(a.percentage || 0) >= passLine).length;
    const passRate = rows.length ? (passed / rows.length) * 100 : 0;

    return {
      ...test,
      attempts: rows.length,
      average: avg,
      best,
      averageAccuracy: avgAccuracy,
      passRate,
    };
  });

  return NextResponse.json({ reports });
}
