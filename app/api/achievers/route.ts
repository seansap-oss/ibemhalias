import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import {
  SEED_ACHIEVERS,
  type AchieverItem,
  type ExamCategory,
} from "@/lib/gallery/achievers-data";

export const dynamic = "force-dynamic";

const GALLERY_SECTION = "achievers_gallery";

async function adminAllowed() {
  const store = await cookies();
  return Boolean(store.get("ibemhal_admin_session")?.value);
}

function parseMetadata(raw: string | null): {
  year: number;
  examCategory: ExamCategory;
  subtitle: string;
  rankBadge?: string;
  highlights: string[];
  story: string;
} {
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      year: Number(parsed.year) || 2026,
      examCategory: parsed.examCategory || "UPSC CSE",
      subtitle: String(parsed.subtitle || ""),
      rankBadge: parsed.rankBadge ? String(parsed.rankBadge) : undefined,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      story: String(parsed.story || ""),
    };
  } catch {
    return {
      year: 2026,
      examCategory: "UPSC CSE",
      subtitle: "",
      highlights: [],
      story: String(raw || ""),
    };
  }
}

export async function GET() {
  try {
    const supabase = getMockTestAdminClient();
    const { data } = await supabase
      .from("cms_content")
      .select("id,title,description,media_url,external_url,created_at")
      .eq("section", GALLERY_SECTION)
      .order("created_at", { ascending: false });

    const customItems: AchieverItem[] = (data ?? []).map((row) => {
      const meta = parseMetadata(row.description);
      return {
        id: row.id,
        year: meta.year,
        examCategory: meta.examCategory,
        title: row.title || "Achiever",
        subtitle: meta.subtitle,
        rankBadge: meta.rankBadge,
        imageUrl: row.media_url || row.external_url || "/gallery/achiever-09.jpg",
        highlights: meta.highlights,
        story: meta.story,
        isSeed: false,
      };
    });

    const items = [...customItems, ...SEED_ACHIEVERS].sort(
      (a, b) => b.year - a.year
    );

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: true, items: SEED_ACHIEVERS });
  }
}

export async function POST(req: NextRequest) {
  if (!(await adminAllowed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    const year = Number(body.year || 2026);
    const examCategory = (body.examCategory || "UPSC CSE") as ExamCategory;
    const subtitle = String(body.subtitle || "").trim();
    const rankBadge = String(body.rankBadge || "").trim();
    const story = String(body.story || "").trim();
    const highlights = Array.isArray(body.highlights)
      ? body.highlights
      : String(body.highlights || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

    if (!title || !imageUrl) {
      return NextResponse.json(
        { error: "Title/Name and Image URL are required." },
        { status: 400 }
      );
    }

    const supabase = getMockTestAdminClient();
    const { data, error } = await supabase
      .from("cms_content")
      .insert({
        section: GALLERY_SECTION,
        title,
        description: JSON.stringify({
          year,
          examCategory,
          subtitle,
          rankBadge,
          highlights,
          story,
        }),
        media_type: "image",
        media_url: imageUrl,
        access_level: "free",
        is_published: true,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to save achiever." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await adminAllowed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = getMockTestAdminClient();
  const { error } = await supabase
    .from("cms_content")
    .delete()
    .eq("id", id)
    .eq("section", GALLERY_SECTION);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
