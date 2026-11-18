import { NextRequest,NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { canManageCourses } from "@/lib/course-admin";
import { canViewDirector } from "@/lib/director-access";
import { hasOwnerSession } from "@/lib/super-admin";
export const dynamic="force-dynamic";
const actions=new Set(["open","play","progress_25","progress_50","progress_75","complete","download_requested","external_open"]);
export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const id=String(body.assetId||""),action=String(body.action||""),source=String(body.sourceType||"cms");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!actions.has(action)||!["cms","teacher","live"].includes(source))return NextResponse.json({error:"Invalid asset event"},{status:400});
 const db=createCmsServiceClient();
 let role="guest",userId:string|null=null,identity:string|null=null,tier="free";
 if(await hasOwnerSession())role="owner";
 else if(await canManageCourses())role="admin";
 else {const session=await createSessionClient();const {data:{user}}=await session.auth.getUser();if(!user)return NextResponse.json({error:"Sign in to record activity"},{status:401});userId=user.id;identity=user.email||null;const {data:profile}=await db.from("profiles").select("role,tier").eq("id",user.id).maybeSingle();role=profile?.role||"student";tier=profile?.tier||"free"}
 if(!["student","instructor","admin","director","owner"].includes(role))return NextResponse.json({error:"Account access required"},{status:403});
 const table=source==="cms"?"cms_content":source==="teacher"?"teacher_workspace_materials":"live_class_resources";
 const {data:asset,error}=await db.from(table).select("*").eq("id",id).maybeSingle();
 if(error||!asset||source==="cms"&&!asset.is_published)return NextResponse.json({error:"Asset unavailable"},{status:404});
 if(source==="cms"){
  if(role==="student"&&asset.course_id){const {data:enrollment}=await db.from("enrollments").select("course_id").eq("user_id",userId).eq("course_id",asset.course_id).eq("payment_status","paid").maybeSingle();if(!enrollment)return NextResponse.json({error:"Course access required"},{status:403})}
  else if(role==="student"&&asset.access_level==="premium"&&!(["premium","foundation","prelims","mains","optional","all-access"].includes(tier)))return NextResponse.json({error:"Premium access required"},{status:403});
 }else if(source==="teacher"){
  if(!["admin","director","owner"].includes(role)&&!(role==="instructor"&&asset.teacher_id===userId))return NextResponse.json({error:"Teacher workspace access required"},{status:403});
 }else if(role==="student"){
  const {data:assignment}=await db.from("live_class_assignments").select("live_class_id").eq("student_id",userId).eq("live_class_id",asset.live_class_id).eq("status","active").maybeSingle();
  if(!assignment)return NextResponse.json({error:"Class access required"},{status:403});
 }
 const {error:writeError}=await db.from("asset_activity_events").insert({source_type:source,source_id:id,asset_number:asset.asset_number,actor_user_id:userId,actor_identity:identity,actor_role:role,action,course_id:asset.course_id||null});
 return writeError?NextResponse.json({error:"Unable to record asset activity"},{status:500}):NextResponse.json({ok:true});
}
export async function GET(){
 if(!(await canViewDirector()))return NextResponse.json({error:"Director access required"},{status:403});
 const db=createCmsServiceClient();
 const visibleRoles=await hasOwnerSession()?["student","instructor","admin","director","owner"]:["student","instructor","admin"];
 const [events,cms,teacher,live]=await Promise.all([
  db.from("asset_activity_events").select("asset_number,source_type,source_id,actor_role,action,created_at").in("actor_role",visibleRoles).order("created_at",{ascending:false}).limit(5000),
  db.from("cms_content").select("id,asset_number,title").order("created_at",{ascending:false}).limit(1000),
  db.from("teacher_workspace_materials").select("id,asset_number,title").order("created_at",{ascending:false}).limit(1000),
  db.from("live_class_resources").select("id,asset_number,title").order("created_at",{ascending:false}).limit(1000),
 ]);
 if(events.error||cms.error||teacher.error||live.error)return NextResponse.json({error:"Unable to load asset inventory"},{status:500});
 const grouped=new Map<string,{asset_number:string;source_type:string;source_id:string;title:string;opens:number;plays:number;downloads:number;last_activity:string|null}>();
 for(const [kind,rows] of [["cms",cms.data],["teacher",teacher.data],["live",live.data]] as const)for(const row of rows||[])if(row.asset_number)grouped.set(row.asset_number,{asset_number:row.asset_number,source_type:kind,source_id:row.id,title:row.title,opens:0,plays:0,downloads:0,last_activity:null});
 for(const e of events.data||[]){const row=grouped.get(e.asset_number);if(!row)continue;if(e.action==="open")row.opens++;if(e.action==="play")row.plays++;if(e.action==="download_requested")row.downloads++;if(!row.last_activity)row.last_activity=e.created_at}
 return NextResponse.json({assets:[...grouped.values()],events:events.data||[]},{headers:{"Cache-Control":"private, no-store"}})
}
