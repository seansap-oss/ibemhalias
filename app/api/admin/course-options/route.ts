import { NextRequest, NextResponse } from "next/server";
import { canManageCourses } from "@/lib/course-admin";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";
const kinds = new Set(["family", "subcategory", "exam", "language"]);
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
async function authorized() { return await canManageCourses(); }

export async function GET() {
  if (!(await authorized())) return fail("Admin access required", 403);
  const { data, error } = await createCmsServiceClient().from("course_option_choices").select("id,kind,label").order("created_at");
  return error ? fail(error.message, 500) : NextResponse.json({ options: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!(await authorized())) return fail("Admin access required", 403);
  const body = await request.json().catch(() => ({}));
  const kind = String(body.kind || ""), label = String(body.label || "").trim().slice(0, 100);
  if (!kinds.has(kind) || !label) return fail("Choose a field and enter an option name");
  const db = createCmsServiceClient();
  const { data: existing } = await db.from("course_option_choices").select("id,label").eq("kind", kind).ilike("label", label).maybeSingle();
  if (existing) return fail("This option already exists", 409);
  const { data, error } = await db.from("course_option_choices").insert({ kind, label }).select("id,kind,label").single();
  return error ? fail(error.message, 500) : NextResponse.json({ option: data });
}

export async function PATCH(request: NextRequest) {
  if (!(await authorized())) return fail("Admin access required", 403);
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || ""), label = String(body.label || "").trim().slice(0, 100);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !label) return fail("Choose an option and enter its new name");
  const db = createCmsServiceClient();
  const { data: old, error: oldError } = await db.from("course_option_choices").select("kind,label").eq("id", id).maybeSingle();
  if (oldError || !old) return fail("Option not found", 404);
  const column = { family: "exam_family", subcategory: "exam_stage", exam: "exam_name", language: "language" }[old.kind as "family" | "subcategory" | "exam" | "language"];
  if (!column) return fail("Invalid option");
  const { data: duplicate } = await db.from("course_option_choices").select("id").eq("kind", old.kind).ilike("label", label).neq("id", id).maybeSingle();
  if (duplicate) return fail("This option already exists", 409);
  // Existing courses keep their saved values; the edited label becomes the future choice.
  const { data, error } = await db.from("course_option_choices").update({ label }).eq("id", id).select("id,kind,label").single();
  return error ? fail(error.message, 500) : NextResponse.json({ option: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await authorized())) return fail("Admin access required", 403);
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid option");
  const { error } = await createCmsServiceClient().from("course_option_choices").delete().eq("id", id);
  return error ? fail(error.message, 500) : NextResponse.json({ ok: true });
}
