import { NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = createCmsServiceClient();
  const [courses, resources] = await Promise.all([
    db.from("courses").select("id,title,exam_name,price_inr,created_at").eq("is_published", true).order("created_at", { ascending: false }).limit(2),
    db.from("cms_content").select("id,title,section_path,created_at").like("section_path", "/resources%").eq("is_published", true).eq("access_level", "free").order("created_at", { ascending: false }).limit(1),
  ]);
  if (courses.error || resources.error) return NextResponse.json({ error: "Latest updates unavailable" }, { status: 500 });
  return NextResponse.json({ courses: courses.data || [], resources: resources.data || [] }, { headers: { "Cache-Control": "no-store" } });
}
