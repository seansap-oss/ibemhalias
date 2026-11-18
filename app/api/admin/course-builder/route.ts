import { NextRequest, NextResponse } from "next/server";
import { canManageCourses } from "@/lib/course-admin";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(value || ""));
const types = new Set(["pdf", "video", "youtube", "audio", "word", "excel", "image", "file"]);
const validOption = (value: string) => value.trim().length > 0 && value.length <= 100;
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  if (!(await canManageCourses())) return fail("Admin access required", 403);
  const db = createCmsServiceClient();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    const { data, error } = await db.from("courses").select("id,course_code,title,slug,description,exam_family,exam_name,exam_stage,language,category,level,price_inr,discounted_price_inr,duration_months,is_published,created_at").order("created_at", { ascending: false }).limit(300);
    return error ? fail(error.message, 500) : NextResponse.json({ courses: data }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!uuid(id)) return fail("Invalid course ID");
  const [course, modules, assets] = await Promise.all([
    db.from("courses").select("*").eq("id", id).maybeSingle(),
    db.from("modules").select("id,title,description,order_index").eq("course_id", id).order("order_index"),
    db.from("cms_content").select("id,asset_number,module_id,title,media_type,file_name,file_size,external_url,access_level,is_published,created_at").eq("course_id", id).order("created_at", { ascending: false }),
  ]);
  if (course.error || modules.error || assets.error) return fail("Unable to load course", 500);
  if (!course.data) return fail("Course not found", 404);
  return NextResponse.json({ course: course.data, modules: modules.data, assets: assets.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!(await canManageCourses())) return fail("Admin access required", 403);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "course");
  const db = createCmsServiceClient();
  if (action === "module") {
    if (!uuid(body.courseId)) return fail("Choose a course");
    const title = String(body.title || "").trim().slice(0, 160);
    if (!title) return fail("Module title required");
    const { data: course } = await db.from("courses").select("id").eq("id", body.courseId).maybeSingle();
    if (!course) return fail("Course not found", 404);
    const { data, error } = await db.from("modules").insert({ course_id: body.courseId, title, description: String(body.description || "").trim(), order_index: Number(body.orderIndex) || 0 }).select("id,title,order_index").single();
    return error ? fail(error.message, 500) : NextResponse.json({ module: data });
  }
  if (action === "asset") {
    if (!uuid(body.courseId) || !uuid(body.moduleId)) return fail("Choose a course and module");
    const { data: module } = await db.from("modules").select("id").eq("id", body.moduleId).eq("course_id", body.courseId).maybeSingle();
    const { data: course } = await db.from("courses").select("slug").eq("id", body.courseId).maybeSingle();
    if (!module || !course) return fail("Course module not found", 404);
    const title = String(body.title || "").trim().slice(0, 180);
    const mediaType = String(body.mediaType || "");
    const storagePath = String(body.storagePath || "");
    const externalUrl = String(body.externalUrl || "");
    if (!title || !types.has(mediaType) || (!storagePath && !externalUrl)) return fail("Asset title, type and file or URL required");
    if (externalUrl && !/^https:\/\//i.test(externalUrl)) return fail("Use an HTTPS media URL");
    if (storagePath && !/^[\w/-]+\/[\w.\-]+$/.test(storagePath)) return fail("Invalid uploaded file path");
    const { data, error } = await db.from("cms_content").insert({ section_path: `/courses/${course.slug}`, course_id: body.courseId, module_id: body.moduleId, title, media_type: mediaType, file_name: body.fileName || null, file_size: Number(body.fileSize) || null, mime_type: body.mimeType || null, storage_path: storagePath || null, external_url: externalUrl || null, access_level: "premium", access_key: "general_premium", is_published: true }).select("id,asset_number,title,media_type").single();
    return error ? fail(error.message, 500) : NextResponse.json({ asset: data });
  }
  if (action !== "course") return fail("Unknown action");
  const title = String(body.title || "").trim().slice(0, 180);
  const description = String(body.description || "").trim().slice(0, 4000);
  const examFamily = String(body.examFamily || "national");
  const stage = String(body.examStage || "foundation");
  const price = Number(body.priceInr);
  const months = Number(body.durationMonths || 12);
  if (!title || !description || !validOption(examFamily) || !validOption(stage) || !validOption(String(body.examName || "")) || !validOption(String(body.language || "")) || !Number.isInteger(price) || price < 0 || price > 10_000_000 || !Number.isInteger(months) || months < 1 || months > 120) return fail("Enter a course name, description, valid exam path, price and duration");
  const values = { title, slug: slugify(String(body.slug || title)), description, exam_family: examFamily, exam_name: String(body.examName || "").trim().slice(0, 100), exam_stage: stage, language: String(body.language || "English").trim().slice(0, 50), category: stage, level: "beginner", price_inr: price, price, duration_months: months, is_published: false };
  if (!values.slug || !values.exam_name) return fail("Exam name required");
  const { data, error } = await db.from("courses").insert(values).select("id,course_code,slug").single();
  return error ? fail(error.code === "23505" ? "This course URL already exists" : error.message, 409) : NextResponse.json({ course: data });
}

export async function PATCH(request: NextRequest) {
  if (!(await canManageCourses())) return fail("Admin access required", 403);
  const body = await request.json().catch(() => ({}));
  if (!uuid(body.id)) return fail("Invalid course ID");
  const db = createCmsServiceClient();
  if (body.action === "details") {
    const title = String(body.title || "").trim().slice(0, 180);
    const description = String(body.description || "").trim().slice(0, 4000);
    const examFamily = String(body.examFamily || "");
    const examStage = String(body.examStage || "");
    const price = Number(body.priceInr), months = Number(body.durationMonths);
    if (!title || !description || !validOption(examFamily) || !validOption(examStage) || !validOption(String(body.examName || "")) || !validOption(String(body.language || "")) || !Number.isInteger(price) || price < 0 || price > 10_000_000 || !Number.isInteger(months) || months < 1 || months > 120) return fail("Enter a course name, description, valid exam path, price and duration");
    const { error } = await db.from("courses").update({ title, description, exam_family: examFamily, exam_name: String(body.examName || "").trim().slice(0,100), exam_stage: examStage, category: examStage, language: String(body.language || "English").trim().slice(0,50), price_inr: price, price, duration_months: months }).eq("id", body.id);
    return error ? fail(error.message, 500) : NextResponse.json({ ok: true });
  }
  if (body.action === "publish") {
    const { data: course, error: courseError } = await db.from("courses").select("id,title,description,price_inr").eq("id", body.id).maybeSingle();
    if (courseError || !course) return fail("Course not found", 404);
    if (body.published && (!course.title?.trim() || !course.description?.trim() || course.price_inr == null)) return fail("Add a title, description and price before publishing");
    const { error } = await db.from("courses").update({ is_published: Boolean(body.published) }).eq("id", body.id);
    return error ? fail(error.message, 500) : NextResponse.json({ ok: true });
  }
  if (body.action === "price") {
    const price = Number(body.priceInr);
    if (!Number.isInteger(price) || price < 0 || price > 10_000_000) return fail("Invalid course price");
    const { error } = await db.from("courses").update({ price_inr: price, price }).eq("id", body.id);
    return error ? fail(error.message, 500) : NextResponse.json({ ok: true });
  }
  return fail("Unknown course update");
}
