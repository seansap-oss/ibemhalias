type WhatsAppResult = {
  ok: boolean;
  configured: boolean;
  messageId?: string;
  error?: string;
  details?: unknown;
};

function clean(value?: string) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

export function whatsappStatus() {
  const accessToken = clean(process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = clean(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const graphVersion = clean(process.env.WHATSAPP_GRAPH_VERSION) || "v23.0";
  return {
    configured: Boolean(accessToken && phoneNumberId),
    accessToken,
    phoneNumberId,
    graphVersion,
  };
}

export async function sendWhatsAppTemplate(args: {
  to: string;
  templateName: string;
  languageCode?: string;
  studentName: string;
  classTitle: string;
  scheduleText: string;
  joinUrl: string;
}): Promise<WhatsAppResult> {
  const cfg = whatsappStatus();
  if (!cfg.configured) {
    return {
      ok: false,
      configured: false,
      error: "WhatsApp Cloud API is not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const templateName = String(args.templateName || "").trim();
  if (!templateName) {
    return { ok: false, configured: true, error: "No approved WhatsApp template name is configured for this reminder." };
  }

  const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: args.to,
      type: "template",
      template: {
        name: templateName,
        language: { code: args.languageCode || "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: args.studentName || "Student" },
              { type: "text", text: args.classTitle || "Live Class" },
              { type: "text", text: args.scheduleText || "Soon" },
              { type: "text", text: args.joinUrl || "" },
            ],
          },
        ],
      },
    }),
  });

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      configured: true,
      error: data?.error?.message || `WhatsApp API returned HTTP ${response.status}`,
      details: data,
    };
  }

  return {
    ok: true,
    configured: true,
    messageId: data?.messages?.[0]?.id,
    details: data,
  };
}

export function renderReminderPreview(template: string, values: Record<string, string>) {
  return String(template || "")
    .replaceAll("{{student_name}}", values.student_name || "Student")
    .replaceAll("{{class_title}}", values.class_title || "Live Class")
    .replaceAll("{{schedule}}", values.schedule || "Soon")
    .replaceAll("{{join_url}}", values.join_url || "");
}
