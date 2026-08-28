import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
async function adminAllowed(){const store=await cookies();return Boolean(store.get("ibemhal_admin_session")?.value)}
export async function GET(){
  if(!(await adminAllowed()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const supabase=getMockTestAdminClient();
  const {data,error}=await supabase.from("mock_questions").select("id,question_text,question_type,exam,subject,topic,difficulty,verification_status,created_at").order("created_at",{ascending:false}).limit(250);
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({questions:data??[]});
}
