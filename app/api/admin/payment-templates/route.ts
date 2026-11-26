import { NextRequest, NextResponse } from "next/server";
import { canManageCourses } from "@/lib/course-admin";
import { canViewDirector } from "@/lib/director-access";
import { hasOwnerSession } from "@/lib/super-admin";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import {
  DEFAULT_PENDING_TEMPLATE,
  DEFAULT_VERIFIED_TEMPLATE,
  getPaymentTemplates,
} from "@/lib/commerce/payment-templates";

export const dynamic = "force-dynamic";

async function canManageTemplates() {
  if (await hasOwnerSession()) return true;
  if (await canViewDirector()) return true;
  return await canManageCourses();
}

export async function GET() {
  if (!(await canManageTemplates())) {
    return NextResponse.json({ error: "Admin or Director access required" }, { status: 403 });
  }
  const templates = await getPaymentTemplates();
  return NextResponse.json(templates, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (!(await canManageTemplates())) {
    return NextResponse.json({ error: "Admin or Director access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const pendingTemplate = String(body.pendingTemplate || "").trim() || DEFAULT_PENDING_TEMPLATE;
  const verifiedTemplate = String(body.verifiedTemplate || "").trim() || DEFAULT_VERIFIED_TEMPLATE;

  const db = createCmsServiceClient();
  const existing = await db
    .from("cms_content")
    .select("id")
    .eq("section_path", "payment-message-templates")
    .limit(1)
    .maybeSingle();

  const payload = JSON.stringify({ pendingTemplate, verifiedTemplate });

  if (existing.data?.id) {
    const { error } = await db
      .from("cms_content")
      .update({ description: payload })
      .eq("id", existing.data.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await db.from("cms_content").insert({
      section_path: "payment-message-templates",
      title: "Payment Confirmation Templates",
      description: payload,
      media_type: "note",
      is_published: false,
      access_level: "premium",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pendingTemplate, verifiedTemplate });
}
