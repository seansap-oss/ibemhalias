import {NextResponse} from "next/server";
import {createCmsServiceClient} from "@/lib/supabase/cms-server";
export async function GET(){const {data}=await createCmsServiceClient().from("director_settings").select("admin_idle_minutes,teacher_idle_minutes").eq("id",true).single();return NextResponse.json({admin:data?.admin_idle_minutes||10,teacher:data?.teacher_idle_minutes||10},{headers:{"Cache-Control":"no-store"}})}
