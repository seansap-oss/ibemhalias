import { NextResponse } from "next/server";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import { requireStudent } from "@/lib/mock-test/student";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getMockTestAdminClient();

  const { data: attempts, error } = await supabase
    .from("mock_attempts")
    .select("percentage,elapsed_seconds,status")
    .eq("student_id", user.id)
    .eq("status", "submitted");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = attempts ?? [];
  const scores = rows.map((row: any) => Number(row.percentage || 0));
  const attempted = rows.length;
  const averageScore = attempted ? scores.reduce((a, b) => a + b, 0) / attempted : 0;
  const bestScore = attempted ? Math.max(...scores) : 0;
  const totalSeconds = rows.reduce((sum: number, row: any) => sum + Number(row.elapsed_seconds || 0), 0);

  return NextResponse.json({ attempted, averageScore, bestScore, totalSeconds });
}
