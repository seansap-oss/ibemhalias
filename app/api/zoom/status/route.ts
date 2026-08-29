import { NextResponse } from "next/server";
import { requireCmsAdmin } from "@/lib/supabase/server-session";
import { zoomConfigStatus } from "@/lib/zoom/config";
import { getZoomAccessToken } from "@/lib/zoom/api";
export const dynamic="force-dynamic";export const runtime="nodejs";
export async function GET(){try{await requireCmsAdmin();return NextResponse.json({ok:true,status:zoomConfigStatus(),provider:String(process.env.NEXT_PUBLIC_LIVE_NOW_PROVIDER||"").toLowerCase()||"presentation"});}catch(e:any){return NextResponse.json({ok:false,error:e?.message||"Unable to read Zoom status."},{status:Number(e?.status||500)});}}
export async function POST(){try{await requireCmsAdmin();const status=zoomConfigStatus();if(!status.configured)return NextResponse.json({ok:false,error:`Missing Zoom configuration: ${status.missing.join(", ")}`,status},{status:503});await getZoomAccessToken();return NextResponse.json({ok:true,connected:true,status,message:"Zoom Server-to-Server OAuth connection succeeded."});}catch(e:any){return NextResponse.json({ok:false,connected:false,error:e?.message||"Zoom connection test failed."},{status:Number(e?.status||502)});}}
