import { NextResponse } from "next/server";
import { hasOwnerSession } from "@/lib/super-admin";
import { createAdminSessionToken, getAdminCookieName } from "@/lib/admin-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
export const runtime="nodejs";
export async function POST(){if(!(await hasOwnerSession()))return NextResponse.json({error:"Owner access required"},{status:403});const token=await createAdminSessionToken("owner:avit-solutions");const {data:activity}=await createCmsServiceClient().from("activity_sessions").insert({identity:"AViT owner",role:"owner"}).select("id").single();const response=NextResponse.json({ok:true});response.cookies.set(getAdminCookieName(),token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:8*3600});if(activity?.id)response.cookies.set("avit_activity_session",activity.id,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:8*3600});return response;}
