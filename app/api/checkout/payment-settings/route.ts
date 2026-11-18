import {NextResponse} from "next/server";
import {createCmsServiceClient} from "@/lib/supabase/cms-server";
export async function GET(){const {data}=await createCmsServiceClient().from("avit_receipt_delivery_settings").select("payment_upi_id").eq("institute_name","Ibemhal IAS").single();return NextResponse.json({vpa:data?.payment_upi_id||null},{headers:{"Cache-Control":"no-store"}})}
