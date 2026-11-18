import { NextRequest, NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const db = createCmsServiceClient();
  const id = request.nextUrl.searchParams.get("id");
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  const query = db.from("courses").select("id,course_code,title,slug,description,short_tagline,thumbnail_url,exam_family,exam_name,exam_stage,language,category,level,price_inr,discounted_price_inr,duration_months,is_published").eq("is_published", true).order("created_at", { ascending: false });
  const { data, error } = id ? await query.eq("id", id) : await query.limit(100);
  if (error) return NextResponse.json({ error: "Unable to load courses" }, { status: 500 });
  if (!id) return NextResponse.json({ courses: data || [] }, { headers: { "Cache-Control": "no-store" } });
  const course = data?.[0];
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const [modules, assets] = await Promise.all([
    db.from("modules").select("id,title,description,order_index").eq("course_id", id).order("order_index"),
    db.from("cms_content").select("id,asset_number,module_id,title,media_type,file_size,sort_order").eq("course_id", id).eq("is_published", true).order("sort_order"),
  ]);
  if (modules.error || assets.error) return NextResponse.json({ error: "Unable to load course outline" }, { status: 500 });
  return NextResponse.json({ course, modules: modules.data || [], assets: assets.data || [] }, { headers: { "Cache-Control": "no-store" } });
}
