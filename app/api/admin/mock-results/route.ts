import { NextResponse } from "next/server";
import { requireMockAdmin } from "@/lib/mock-test/admin-auth";
import { getMockTestAdminClient } from "@/lib/mock-test/server";

export async function GET() {
  if (!(await requireMockAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getMockTestAdminClient();

  const { data, error } = await supabase
    .from("mock_attempts")
    .select("id,student_id,status,score,total_marks,percentage,accuracy,correct_count,incorrect_count,unattempted_count,elapsed_seconds,submitted_at,started_at,mock_tests(title,exam_category)")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempts: data ?? [] });
}
