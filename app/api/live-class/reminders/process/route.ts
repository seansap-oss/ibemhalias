import { NextRequest, NextResponse } from "next/server";
import { liveService, normalizeIndianWhatsAppPhone, safeOrigin } from "@/lib/live-class/server";
import { sendWhatsAppTemplate } from "@/lib/live-class/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type AnyRow = Record<string, any>;

export async function POST(request: NextRequest) {
  const client = liveService();
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const [{ data: secretRow }, { data: enabledRow }] = await Promise.all([
    client.from("live_class_settings").select("value").eq("key", "automation_secret").maybeSingle(),
    client.from("live_class_settings").select("value").eq("key", "automation_enabled").maybeSingle(),
  ]);
  if (!secretRow?.value || token !== secretRow.value) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (enabledRow?.value === "false") return NextResponse.json({ ok: true, skipped: "automation_disabled" });

  const now = new Date().toISOString();
  const { data: due, error } = await client.from("live_class_notifications")
    .select("id,student_id,live_class_id,rule_id,rule_type,scheduled_for,status,attempts")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .lt("attempts", 3)
    .order("scheduled_for")
    .limit(100);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ ok: true, processed: 0, sent: 0, failed: 0 });

  const studentIds = [...new Set(due.map((x: AnyRow) => x.student_id))];
  const classIds = [...new Set(due.map((x: AnyRow) => x.live_class_id))];
  const ruleIds = [...new Set(due.map((x: AnyRow) => x.rule_id).filter(Boolean))];
  const [{ data: students }, { data: classes }, { data: rules }, { data: baseRow }] = await Promise.all([
    client.from("profiles").select("id,full_name,phone,whatsapp_opt_in").in("id", studentIds),
    client.from("live_classes").select("id,title,topic,starts_at,status,recording_url").in("id", classIds),
    ruleIds.length ? client.from("live_class_reminder_rules").select("id,rule_type,whatsapp_template_name,enabled").in("id", ruleIds) : Promise.resolve({ data: [] }),
    client.from("live_class_settings").select("value").eq("key", "automation_base_url").maybeSingle(),
  ]);
  const studentMap = new Map((students || []).map((x: AnyRow) => [x.id, x]));
  const classMap = new Map((classes || []).map((x: AnyRow) => [x.id, x]));
  const ruleMap = new Map((rules || []).map((x: AnyRow) => [x.id, x]));
  const baseUrl = safeOrigin(baseRow?.value || "");
  let sent = 0, failed = 0, skipped = 0;

  for (const item of due) {
    const student: AnyRow | undefined = studentMap.get(item.student_id);
    const liveClass: AnyRow | undefined = classMap.get(item.live_class_id);
    const rule: AnyRow | undefined = item.rule_id ? ruleMap.get(item.rule_id) : undefined;
    if (!student || !liveClass || student.whatsapp_opt_in === false || !student.phone || rule?.enabled === false) {
      await client.from("live_class_notifications").update({ status: "skipped", last_error: "Student, phone, opt-in, class or rule unavailable." }).eq("id", item.id);
      skipped++; continue;
    }
    const phone = normalizeIndianWhatsAppPhone(student.phone);
    const scheduleText = new Date(liveClass.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
    const joinUrl = `${baseUrl}/live-classes/${liveClass.id}`;
    const templateName = rule?.whatsapp_template_name || process.env.WHATSAPP_TEMPLATE_CLASS_REMINDER || "ibemhal_class_reminder";
    const result = await sendWhatsAppTemplate({ to: phone, templateName, studentName: student.full_name, classTitle: `${liveClass.title} - ${liveClass.topic}`, scheduleText, joinUrl });
    if (result.ok) {
      await client.from("live_class_notifications").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.messageId || null, attempts: Number(item.attempts || 0) + 1, last_error: null }).eq("id", item.id);
      sent++;
    } else {
      const attempts = Number(item.attempts || 0) + 1;
      await client.from("live_class_notifications").update({ status: attempts >= 3 ? "failed" : "pending", attempts, last_error: result.error || "WhatsApp send failed", scheduled_for: attempts >= 3 ? item.scheduled_for : new Date(Date.now() + 10 * 60000).toISOString() }).eq("id", item.id);
      failed++;
    }
  }
  return NextResponse.json({ ok: true, processed: due.length, sent, failed, skipped });
}
