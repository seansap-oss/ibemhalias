import { NextRequest, NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { requireCmsAdmin } from "@/lib/supabase/server-session";
import { logAdminWork } from "@/lib/admin-audit";
import { runWithFallback, extractJson } from "@/lib/ai/router";
import { SITE_CONTACT } from "@/lib/site-contact";
import { branchLocations } from "@/components/portal/nav-items";

const CONFIG_SECTION = "support-concierge-config";
const LEADS_SECTION = "support-leads";
const BUCKET = "cms-content";

export type ConciergeConfig = {
  voiceEnabled: boolean;
  autoGreetOnOpen: boolean;
  voiceGreeting: string;
  busyNotice: string;
  audioStoragePath: string | null;
  audioUrl: string;
  salesPhone: string;
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  aiPromptHint: string;
};

export const DEFAULT_CONCIERGE_CONFIG: ConciergeConfig = {
  voiceEnabled: true,
  autoGreetOnOpen: true,
  voiceGreeting:
    "Welcome to Ibemhal IAS, Manipur's trusted low-fee Civil Services coaching institute. All counsellors may currently be assisting students, so I am your automated AI concierge. You can check our three Imphal centres, speak with Sales or Support, get smart course recommendations, or pay fees via UPI QR to receive an instant fee receipt.",
  busyNotice:
    "All lines may be busy during peak batch hours. Listen to our quick voice guide, chat with our AI Course Advisor, or drop a message for immediate callback.",
  audioStoragePath: null,
  audioUrl: "",
  salesPhone: SITE_CONTACT.phoneDisplay,
  supportPhone: SITE_CONTACT.phoneDisplay,
  supportEmail: SITE_CONTACT.helpdeskEmail,
  whatsappNumber: SITE_CONTACT.whatsappNumber,
  aiPromptHint:
    "Recommend affordable IAS, UPSC, MPSC, Banking, and SSC coaching programmes at Ibemhal IAS (Keishampat, Chingmeirong, and Thangmeiband branches in Imphal, Manipur). Explain that students can pay securely via UPI QR on the Courses page and download an instant fee receipt.",
};

type PublicCourse = {
  id: string;
  title: string;
  description: string | null;
  exam_family: string | null;
  exam_name: string | null;
  exam_stage: string | null;
  price_inr: number;
  discounted_price_inr: number | null;
};

async function loadConciergeConfig(): Promise<ConciergeConfig & { resolvedAudioUrl: string | null }> {
  const db = createCmsServiceClient();
  const { data } = await db
    .from("cms_content")
    .select("description,storage_path,external_url,created_at")
    .eq("section_path", CONFIG_SECTION)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = data?.[0];
  let parsed: Partial<ConciergeConfig> = {};
  if (row?.description) {
    try {
      parsed = JSON.parse(row.description);
    } catch {
      parsed = {};
    }
  }

  const merged: ConciergeConfig = {
    ...DEFAULT_CONCIERGE_CONFIG,
    ...parsed,
    audioStoragePath: row?.storage_path || parsed.audioStoragePath || null,
    audioUrl: (parsed.audioUrl || row?.external_url || "").trim(),
  };

  let resolvedAudioUrl: string | null = merged.audioUrl || null;
  if (merged.audioStoragePath) {
    try {
      const { data: signed } = await db.storage
        .from(BUCKET)
        .createSignedUrl(merged.audioStoragePath, 60 * 60);
      if (signed?.signedUrl) {
        resolvedAudioUrl = signed.signedUrl;
      }
    } catch {
      // Keep external URL fallback if storage signing fails
    }
  }

  return { ...merged, resolvedAudioUrl };
}

async function loadPublishedCourses(): Promise<PublicCourse[]> {
  try {
    const db = createCmsServiceClient();
    const { data } = await db
      .from("courses")
      .select(
        "id,title,description,exam_family,exam_name,exam_stage,price_inr,discounted_price_inr"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(12);
    return (data || []) as PublicCourse[];
  } catch {
    return [];
  }
}

function buildFallbackRecommendation(
  query: string,
  courses: PublicCourse[],
  config: ConciergeConfig
) {
  const q = query.toLowerCase();
  const wantsPayment =
    q.includes("pay") ||
    q.includes("fee") ||
    q.includes("receipt") ||
    q.includes("upi") ||
    q.includes("enroll");
  const wantsContact =
    q.includes("phone") ||
    q.includes("number") ||
    q.includes("call") ||
    q.includes("email") ||
    q.includes("address") ||
    q.includes("branch") ||
    q.includes("location");

  const matched = courses
    .filter((c) => {
      const hay = `${c.title} ${c.exam_family || ""} ${c.exam_name || ""} ${c.exam_stage || ""} ${c.description || ""}`.toLowerCase();
      if (q.includes("upsc") || q.includes("ias") || q.includes("civil") || q.includes("mpsc")) {
        return hay.includes("upsc") || hay.includes("ias") || hay.includes("mpsc") || hay.includes("foundation");
      }
      if (q.includes("bank") || q.includes("ibps") || q.includes("po") || q.includes("rrb")) {
        return hay.includes("bank") || hay.includes("ibps") || hay.includes("rrb");
      }
      if (q.includes("ssc") || q.includes("cgl") || q.includes("chsl")) {
        return hay.includes("ssc") || hay.includes("state");
      }
      return true;
    })
    .slice(0, 3);

  const picked = matched.length > 0 ? matched : courses.slice(0, 3);

  const lines: string[] = [];
  if (wantsContact) {
    lines.push(
      `You can reach our Admissions & Sales team at ${config.salesPhone} or Customer Support at ${config.supportEmail}. Our 3 Imphal branches are at Keishampat, Chingmeirong, and Thangmeiband.`
    );
  }
  if (wantsPayment) {
    lines.push(
      "To pay fees & get an instant receipt: open our Courses page, pick your batch, click Enroll / Pay via UPI QR, submit your UTR/screenshot — you receive an instant downloadable receipt and automatic verification update."
    );
  }
  if (picked.length > 0) {
    const summary = picked
      .map((c) => {
        const fee = Number(c.discounted_price_inr ?? c.price_inr ?? 0);
        return `• ${c.title} (${c.exam_family || "General"} — ₹${fee.toLocaleString("en-IN")})`;
      })
      .join("\n");
    lines.push(`Here are our top recommended programmes for you:\n${summary}`);
  } else {
    lines.push(
      `Explore our UPSC, MPSC, Banking & SSC batches on the Courses page, or call ${config.salesPhone} for personalised batch counselling.`
    );
  }

  return {
    reply: lines.join("\n\n"),
    recommendedCourses: picked.map((c) => ({
      id: c.id,
      title: c.title,
      examFamily: c.exam_family || "UPSC & State",
      priceInr: Number(c.discounted_price_inr ?? c.price_inr ?? 0),
    })),
    payHref: "/courses",
    servedBy: "smart-catalog",
  };
}

export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get("mode");
    const config = await loadConciergeConfig();

    if (mode === "leads") {
      await requireCmsAdmin();
      const db = createCmsServiceClient();
      const { data: leadsData, error } = await db
        .from("cms_content")
        .select("id,title,month_label,date_label,external_url,description,created_at")
        .eq("section_path", LEADS_SECTION)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const leads = (leadsData || []).map((row: any) => ({
        id: row.id,
        name: row.title || "Visitor",
        department: row.month_label || "support",
        phone: row.date_label || "",
        email: row.external_url || "",
        message: row.description || "",
        createdAt: row.created_at,
      }));

      return NextResponse.json(
        { config, leads },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const courses = await loadPublishedCourses();
    return NextResponse.json(
      {
        config,
        branches: branchLocations,
        courses: courses.map((c) => ({
          id: c.id,
          title: c.title,
          examFamily: c.exam_family || "Civil Services",
          examStage: c.exam_stage || "",
          priceInr: Number(c.discounted_price_inr ?? c.price_inr ?? 0),
          originalPriceInr: Number(c.price_inr ?? 0),
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err: any) {
    const status = err?.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: err?.message || "Failed to load concierge data" },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body?.action || "");

    if (action === "save_config") {
      await requireCmsAdmin();
      const db = createCmsServiceClient();

      // Clear previous concierge config rows so only latest single config applies
      await db.from("cms_content").delete().eq("section_path", CONFIG_SECTION);

      const nextConfig: ConciergeConfig = {
        voiceEnabled: body.voiceEnabled !== false,
        autoGreetOnOpen: body.autoGreetOnOpen !== false,
        voiceGreeting: String(body.voiceGreeting || DEFAULT_CONCIERGE_CONFIG.voiceGreeting).trim(),
        busyNotice: String(body.busyNotice || DEFAULT_CONCIERGE_CONFIG.busyNotice).trim(),
        audioStoragePath: body.audioStoragePath ? String(body.audioStoragePath) : null,
        audioUrl: String(body.audioUrl || "").trim(),
        salesPhone: String(body.salesPhone || SITE_CONTACT.phoneDisplay).trim(),
        supportPhone: String(body.supportPhone || SITE_CONTACT.phoneDisplay).trim(),
        supportEmail: String(body.supportEmail || SITE_CONTACT.helpdeskEmail).trim(),
        whatsappNumber: String(body.whatsappNumber || SITE_CONTACT.whatsappNumber).replace(/[^\d]/g, "") || SITE_CONTACT.whatsappNumber,
        aiPromptHint: String(body.aiPromptHint || DEFAULT_CONCIERGE_CONFIG.aiPromptHint).trim(),
      };

      const { error } = await db.from("cms_content").insert({
        section_path: CONFIG_SECTION,
        title: "Support & AI Voice Concierge Configuration",
        description: JSON.stringify(nextConfig),
        media_type: nextConfig.audioStoragePath ? "audio" : "note",
        storage_path: nextConfig.audioStoragePath,
        external_url: nextConfig.audioUrl || null,
        access_level: "free",
        is_published: false,
      });

      if (error) throw error;

      await logAdminWork(
        "Updated Support & AI Voice Concierge",
        "Landing Concierge",
        `Voice ${nextConfig.voiceEnabled ? "enabled" : "muted"}`
      );

      return NextResponse.json({ ok: true, config: nextConfig });
    }

    if (action === "submit_lead") {
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      const email = String(body.email || "").trim();
      const department = ["sales", "support", "coaching"].includes(String(body.department))
        ? String(body.department)
        : "support";
      const message = String(body.message || "").trim();

      if (!name || (!phone && !email)) {
        return NextResponse.json(
          { error: "Please provide your name and phone number or email." },
          { status: 400 }
        );
      }

      const db = createCmsServiceClient();
      const { data, error } = await db
        .from("cms_content")
        .insert({
          section_path: LEADS_SECTION,
          title: name,
          month_label: department,
          date_label: phone || "No phone",
          external_url: email || null,
          description: message || "Callback requested via AI Concierge",
          media_type: "note",
          access_level: "free",
          is_published: false,
        })
        .select("id")
        .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        leadId: data?.id || null,
        message: `Thank you ${name}! Your request has been routed to our ${department.toUpperCase()} desk. We will reach back shortly.`,
      });
    }

    if (action === "ask_ai") {
      const userQuestion = String(body.message || "").trim();
      if (!userQuestion) {
        return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
      }

      const [config, courses] = await Promise.all([
        loadConciergeConfig(),
        loadPublishedCourses(),
      ]);

      const catalogText = courses
        .map(
          (c) =>
            `- ID:${c.id} | "${c.title}" | Family:${c.exam_family || "General"} | Stage:${c.exam_stage || "All"} | Fee:₹${Number(
              c.discounted_price_inr ?? c.price_inr ?? 0
            )}`
        )
        .join("\n");

      const systemPrompt = [
        "You are the friendly, knowledgeable AI Course Advisor & Support Concierge for Ibemhal IAS (Imphal, Manipur).",
        `Branches: Keishampat, Chingmeirong, Thangmeiband (Imphal, Manipur).`,
        `Sales Phone: ${config.salesPhone} | Support Email: ${config.supportEmail} | WhatsApp: +${config.whatsappNumber}`,
        `Admin guidance: ${config.aiPromptHint}`,
        "Students can pay course fees online via UPI QR on /courses and immediately get a downloadable fee receipt after submitting payment proof / approval.",
        "Return strict JSON matching: { \"reply\": string, \"recommendedCourseIds\": string[] } where reply is concise (max 110 words), warm, practical, and tailored to the visitor's exam goal.",
      ].join("\n");

      const userPrompt = `Available Published Courses:\n${catalogText || "No courses currently listed"}\n\nVisitor Question:\n${userQuestion}`;

      const aiResult = await runWithFallback(systemPrompt, userPrompt, { jsonMode: true });
      const parsed = aiResult.text
        ? extractJson<{ reply?: string; recommendedCourseIds?: string[] }>(aiResult.text)
        : null;

      if (parsed?.reply) {
        const pickedIds = Array.isArray(parsed.recommendedCourseIds)
          ? new Set(parsed.recommendedCourseIds)
          : new Set<string>();
        const recCourses = courses
          .filter((c) => pickedIds.has(c.id))
          .slice(0, 3)
          .map((c) => ({
            id: c.id,
            title: c.title,
            examFamily: c.exam_family || "Civil Services",
            priceInr: Number(c.discounted_price_inr ?? c.price_inr ?? 0),
          }));

        return NextResponse.json({
          reply: parsed.reply,
          recommendedCourses: recCourses,
          payHref: "/courses",
          servedBy: aiResult.servedBy || "ai",
        });
      }

      return NextResponse.json(buildFallbackRecommendation(userQuestion, courses, config));
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    const status = err?.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: err?.message || "Concierge request failed" },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireCmsAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const db = createCmsServiceClient();
    const { error } = await db
      .from("cms_content")
      .delete()
      .eq("id", id)
      .eq("section_path", LEADS_SECTION);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err?.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: err?.message || "Failed to delete lead" },
      { status }
    );
  }
}
