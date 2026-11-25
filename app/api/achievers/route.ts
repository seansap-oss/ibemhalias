import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import {
  DEFAULT_EXAMS,
  SEED_ACHIEVERS,
  type AchieverItem,
} from "@/lib/gallery/achievers-data";

export const dynamic = "force-dynamic";

const GALLERY_SECTION = "achievers_gallery";
const EXAMS_SECTION = "achievers_exams";

async function adminAllowed() {
  const store = await cookies();
  return Boolean(store.get("ibemhal_admin_session")?.value);
}

function parseMetadata(raw: string | null): {
  year: number;
  examCategory: string;
  cardType: "poster" | "topper";
  spotlightRank: "rank_1" | "rank_2" | "rank_3" | "group_latest" | "none";
  subtitle: string;
  rankBadge?: string;
  highlights: string[];
  story: string;
} {
  try {
    const parsed = JSON.parse(raw || "{}");
    const validRanks = new Set(["rank_1", "rank_2", "rank_3", "group_latest", "none"]);
    return {
      year: Number(parsed.year) || 2026,
      examCategory: String(parsed.examCategory || "UPSC CSE"),
      cardType: parsed.cardType === "topper" ? "topper" : "poster",
      spotlightRank: validRanks.has(parsed.spotlightRank) ? parsed.spotlightRank : "none",
      subtitle: String(parsed.subtitle || ""),
      rankBadge: parsed.rankBadge ? String(parsed.rankBadge) : undefined,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      story: String(parsed.story || ""),
    };
  } catch {
    return {
      year: 2026,
      examCategory: "UPSC CSE",
      cardType: "poster",
      spotlightRank: "none",
      subtitle: "",
      highlights: [],
      story: String(raw || ""),
    };
  }
}

export async function GET() {
  try {
    const supabase = getMockTestAdminClient();
    const [{ data: galleryRows }, { data: examRows }] = await Promise.all([
      supabase
        .from("cms_content")
        .select("id,title,description,media_url,external_url,created_at")
        .eq("section", GALLERY_SECTION)
        .order("created_at", { ascending: false }),
      supabase
        .from("cms_content")
        .select("id,title")
        .eq("section", EXAMS_SECTION)
        .order("created_at", { ascending: true }),
    ]);

    const customItems: AchieverItem[] = (galleryRows ?? []).map((row) => {
      const meta = parseMetadata(row.description);
      return {
        id: row.id,
        year: meta.year,
        examCategory: meta.examCategory,
        cardType: meta.cardType,
        spotlightRank: meta.spotlightRank,
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

    const customExams = (examRows ?? [])
      .map((r) => String(r.title || "").trim())
      .filter(Boolean);

    const exams = Array.from(
      new Set([
        ...DEFAULT_EXAMS,
        ...customExams,
        ...items.map((i) => i.examCategory).filter(Boolean),
      ])
    );

    return NextResponse.json({ ok: true, items, exams });
  } catch {
    return NextResponse.json({
      ok: true,
      items: SEED_ACHIEVERS,
      exams: DEFAULT_EXAMS,
    });
  }
}

export async function POST(req: NextRequest) {
  if (!(await adminAllowed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const supabase = getMockTestAdminClient();

    if (body.action === "add_exam") {
      const examName = String(body.examName || "").trim();
      if (!examName) {
        return NextResponse.json(
          { error: "Exam name is required." },
          { status: 400 }
        );
      }
      const { data, error } = await supabase
        .from("cms_content")
        .insert({
          section: EXAMS_SECTION,
          title: examName,
          media_type: "text",
          access_level: "free",
          is_published: true,
        })
        .select("id,title")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, exam: data }, { status: 201 });
    }

    const title = String(body.title || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    const year = Number(body.year || 2026);
    const examCategory = String(body.examCategory || "UPSC CSE").trim();
    const cardType = body.cardType === "topper" ? "topper" : "poster";
    const spotlightRank = String(body.spotlightRank || "none");
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
        { error: "Title/Name and Photo are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("cms_content")
      .insert({
        section: GALLERY_SECTION,
        title,
        description: JSON.stringify({
          year,
          examCategory,
          cardType,
          spotlightRank,
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

export async function PATCH(req: NextRequest) {
  if (!(await adminAllowed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    const title = String(body.title || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    if (!id || !title || !imageUrl) {
      return NextResponse.json(
        { error: "ID, Title, and Photo are required." },
        { status: 400 }
      );
    }

    const highlights = Array.isArray(body.highlights)
      ? body.highlights
      : String(body.highlights || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

    const supabase = getMockTestAdminClient();
    const { error } = await supabase
      .from("cms_content")
      .update({
        title,
        media_url: imageUrl,
        description: JSON.stringify({
          year: Number(body.year || 2026),
          examCategory: String(body.examCategory || "UPSC CSE").trim(),
          cardType: body.cardType === "topper" ? "topper" : "poster",
          spotlightRank: String(body.spotlightRank || "none"),
          subtitle: String(body.subtitle || "").trim(),
          rankBadge: String(body.rankBadge || "").trim(),
          highlights,
          story: String(body.story || "").trim(),
        }),
      })
      .eq("id", id)
      .eq("section", GALLERY_SECTION);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to update achiever." },
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
