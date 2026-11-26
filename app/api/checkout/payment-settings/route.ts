import { NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = createCmsServiceClient();
  const [{ data }, { data: qrRow }] = await Promise.all([
    db
      .from("avit_receipt_delivery_settings")
      .select("payment_upi_id")
      .eq("institute_name", "Ibemhal IAS")
      .maybeSingle(),
    db
      .from("cms_content")
      .select("title, external_url, description")
      .eq("section_path", "payment-qr-config")
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json(
    {
      vpa: data?.payment_upi_id || null,
      instituteName: qrRow?.title || "Ibemhal IAS",
      qrImageUrl: qrRow?.external_url || null,
      paymentNote:
        qrRow?.description ||
        "Make sure you are sending payment to the right QR code for Ibemhal IAS.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
