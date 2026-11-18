import { NextRequest, NextResponse } from "next/server";
import { hasOwnerSession } from "@/lib/super-admin";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const deny = () => NextResponse.json({ error: "Owner access required." }, { status: 403 });
function errorResponse(error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : "Platform billing unavailable. Apply migration 017." }, { status: 503 }); }
export async function GET() {
  if (!(await hasOwnerSession())) return deny();
  try { const db=createCmsServiceClient(); const [settings,plans,clients,invoices]=await Promise.all([
    db.from("avit_platform_settings").select("fee_bps,fee_includes_gst,owner_upi_id,updated_at").eq("id",true).single(),
    db.from("avit_plans").select("id,name,student_limit,monthly_paise,active").order("monthly_paise"),
    db.from("avit_clients").select("id,name,contact_email,plan_id,status,created_at").order("created_at",{ascending:false}),
    db.from("avit_subscription_invoices").select("id,client_id,amount_paise,status,period_start,period_end").order("created_at",{ascending:false}).limit(100)
  ]); for(const result of [settings,plans,clients,invoices])if(result.error)throw result.error;const s=settings.data;if(!s)throw new Error("Platform settings are missing. Apply migration 017."); return NextResponse.json({settings:{fee_bps:s.fee_bps,fee_includes_gst:s.fee_includes_gst,owner_upi_id:s.owner_upi_id,owner_upi_masked:s.owner_upi_id?`••••${s.owner_upi_id.slice(-5)}`:"Not set"},plans:plans.data,clients:clients.data,invoices:invoices.data},{headers:{"Cache-Control":"no-store"}}); }catch(e){return errorResponse(e);}
}
export async function POST(request: NextRequest) {
  if (!(await hasOwnerSession())) return deny();
  try {const body=await request.json();const db=createCmsServiceClient();let result;
    if(body.action==="settings") {const bps=Number(body.fee_bps);if(!Number.isInteger(bps)||bps<0||bps>1000) return NextResponse.json({error:"Fee must be between 0% and 10%."},{status:400});const update:Record<string,unknown>={fee_bps:bps,fee_includes_gst:true,updated_at:new Date().toISOString()};if(body.owner_upi_id!==undefined){const upi=String(body.owner_upi_id).trim();if(upi&&!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(upi))return NextResponse.json({error:"Enter a valid UPI ID."},{status:400});update.owner_upi_id=upi||null;}result=await db.from("avit_platform_settings").update(update).eq("id",true);}
    else if(body.action==="plan"){const limit=Number(body.student_limit),amount=Number(body.monthly_paise);if(!body.id||!Number.isInteger(limit)||limit<1||!Number.isInteger(amount)||amount<0)return NextResponse.json({error:"Invalid plan values."},{status:400});result=await db.from("avit_plans").update({student_limit:limit,monthly_paise:amount}).eq("id",String(body.id));}
    else if(body.action==="client"){const name=String(body.name||"").trim(),email=String(body.contact_email||"").trim();if(!name||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Client name and email required."},{status:400});result=await db.from("avit_clients").insert({name,contact_email:email,plan_id:body.plan_id||null});}
    else return NextResponse.json({error:"Unknown action."},{status:400});
    if(result.error)throw result.error;return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
