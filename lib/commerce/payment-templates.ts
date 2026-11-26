import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const DEFAULT_PENDING_TEMPLATE =
  "Hi {{name}}, we received your UPI payment reference ({{reference}}) for {{course}} (₹{{amount}}). We are verifying it and will activate your course & get back to you shortly. — Ibemhal IAS";

export const DEFAULT_VERIFIED_TEMPLATE =
  "Hi {{name}}, your payment of ₹{{amount}} for {{course}} is verified! Receipt: {{receipt}}. Sign in at {{login_url}} using Email: {{email}}{{credentials_note}} to start learning. — Ibemhal IAS";

export interface PaymentTemplates {
  pendingTemplate: string;
  verifiedTemplate: string;
}

export async function getPaymentTemplates(): Promise<PaymentTemplates> {
  try {
    const db = createCmsServiceClient();
    const { data } = await db
      .from("cms_content")
      .select("description")
      .eq("section_path", "payment-message-templates")
      .limit(1)
      .maybeSingle();

    if (data?.description) {
      const parsed = JSON.parse(data.description) as Partial<PaymentTemplates>;
      return {
        pendingTemplate: parsed.pendingTemplate?.trim() || DEFAULT_PENDING_TEMPLATE,
        verifiedTemplate: parsed.verifiedTemplate?.trim() || DEFAULT_VERIFIED_TEMPLATE,
      };
    }
  } catch {
    // Fallback to defaults
  }
  return {
    pendingTemplate: DEFAULT_PENDING_TEMPLATE,
    verifiedTemplate: DEFAULT_VERIFIED_TEMPLATE,
  };
}

export function renderPaymentTemplate(
  template: string,
  vars: {
    name?: string;
    course?: string;
    amount?: string;
    reference?: string;
    receipt?: string;
    email?: string;
    password?: string;
    loginUrl?: string;
  }
): string {
  const credentialsNote = vars.password ? ` and Temporary Password: ${vars.password}` : "";
  return template
    .replaceAll("{{name}}", vars.name || "Student")
    .replaceAll("{{course}}", vars.course || "Course")
    .replaceAll("{{amount}}", vars.amount || "0")
    .replaceAll("{{reference}}", vars.reference || "—")
    .replaceAll("{{receipt}}", vars.receipt || "Pending")
    .replaceAll("{{email}}", vars.email || "")
    .replaceAll("{{password}}", vars.password || "(use your existing password)")
    .replaceAll("{{credentials_note}}", credentialsNote)
    .replaceAll("{{login_url}}", vars.loginUrl || "https://ibemhal-ias-lms-preview.vercel.app/login");
}
