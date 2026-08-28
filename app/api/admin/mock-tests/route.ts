import { NextRequest, NextResponse } from "next/server";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import { cookies } from "next/headers";

async function adminAllowed() {
  const store = await cookies();
  return Boolean(store.get("ibemhal_admin_session")?.value);
}

export async function GET() {
  if (!(await adminAllowed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getMockTestAdminClient();
  const { data, error } = await supabase.from("mock_tests").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tests: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await adminAllowed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const supabase = getMockTestAdminClient();
  const slug = String(body.slug || body.title || "test").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const { data, error } = await supabase.from("mock_tests").insert({
    title: String(body.title || "Untitled Test"),
    slug: `${slug}-${Date.now()}`,
    description: body.description || null,
    exam_category: body.exam_category || "UPSC",
    subject: body.subject || null,
    test_type: body.test_type || "full_length",
    duration_minutes: Number(body.duration_minutes || 60),
    total_marks: Number(body.total_marks || 0),
    negative_marking: Number(body.negative_marking || 0),
    passing_marks: Number(body.passing_marks || 0),
    language: body.language || "English",
    show_answers_after_submit: body.show_answers_after_submit !== false,
    show_solutions: body.show_solutions !== false,
    status: "draft",
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ test: data }, { status: 201 });
}
