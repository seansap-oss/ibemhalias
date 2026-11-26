import {NextRequest,NextResponse} from "next/server";
import {canViewDirector} from "@/lib/director-access";
import {hasOwnerSession} from "@/lib/super-admin";
import {createCmsServiceClient} from "@/lib/supabase/cms-server";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const owner= request.nextUrl.searchParams.get("scope")==="owner";
 if(owner ? !(await hasOwnerSession()) : !(await canViewDirector()))return NextResponse.json({error:"Activity access required"},{status:403});
 const db=createCmsServiceClient();
 const visibleRoles=owner?["student","instructor","admin","director","owner"]:["student","instructor","admin"];
 const day=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});const since=new Date(`${day}T00:00:00+05:30`).toISOString();const until=new Date(new Date(since).getTime()+86400000).toISOString();
 const [sessions,studentSamples,studentCount,events,uploads,orders,students,recentStudents,signupsToday,classes,settings,teachers,adminAccounts,adminAuditLog]=await Promise.all([
  db.from("activity_sessions").select("identity,role,logged_in_at,last_seen_at,logged_out_at,active_seconds,country_code,region_code,user_id").in("role",visibleRoles).order("logged_in_at",{ascending:false}).limit(300),
  db.from("activity_sessions").select("user_id,country_code,region_code").eq("role","student").gte("logged_in_at",since).limit(1000),
  db.from("activity_sessions").select("id",{count:"exact",head:true}).eq("role","student").gte("logged_in_at",since),
  db.from("activity_events").select("role,kind,target_id,duration_seconds,created_at").in("role",visibleRoles).order("created_at",{ascending:false}).limit(200),
  db.from("teacher_activity_log").select("action,details,created_at,teacher_id").order("created_at",{ascending:false}).limit(100),
  db.from("course_purchase_orders").select("course_id,amount_paise,status,created_at").eq("status","paid").gte("created_at",since),
  db.from("profiles").select("id",{count:"exact",head:true}).eq("role","student"),
  db.from("profiles").select("id,full_name,email,created_at").eq("role","student").order("created_at",{ascending:false}).limit(30),
  db.from("profiles").select("id",{count:"exact",head:true}).eq("role","student").gte("created_at",since),
  db.from("live_classes").select("id",{count:"exact",head:true}).gte("starts_at",since).lt("starts_at",until),
  db.from("director_settings").select("admin_idle_minutes,teacher_idle_minutes").eq("id",true).single(),
  db.from("profiles").select("id,full_name,email").eq("role","instructor").limit(500),
  db.from("profiles").select("id,full_name,email,created_at").eq("role","admin").order("created_at",{ascending:false}).limit(100),
  db.from("cms_content").select("id,title,month_label,date_label,description,created_at").eq("section_path","admin-work-audit").order("created_at",{ascending:false}).limit(100),
 ]);
 const failed=[sessions,studentSamples,studentCount,events,uploads,orders,students,recentStudents,signupsToday,classes,settings,teachers,adminAccounts,adminAuditLog].find(result=>result.error);
 if(failed?.error)return NextResponse.json({error:"Unable to load current director data."},{status:500});
 const samples=studentSamples.data||[];
 const regions=Object.entries(samples.reduce((a:Record<string,number>,s)=>{const key=[s.region_code,s.country_code].filter(Boolean).join(" / ")||"Unknown";a[key]=(a[key]||0)+1;return a},{} as Record<string,number>));
 return NextResponse.json({viewer:owner?"owner":"director",sessions:sessions.data||[],studentRegions:regions,studentLoginsToday:studentCount.count||0,uniqueStudentsToday:new Set(samples.map(s=>s.user_id).filter(Boolean)).size,studentSignupsToday:signupsToday.count||0,recentStudents:recentStudents.data||[],events:events.data||[],teacherUploads:uploads.data||[],teacherNames:Object.fromEntries((teachers.data||[]).map(t=>[t.id,t.full_name||t.email||"Teacher"])),sales:orders.data||[],students:students.count||0,classes:classes.count||0,settings:settings.data,adminAccounts:adminAccounts.data||[],adminAuditLog:adminAuditLog.data||[]},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:NextRequest){if(!(await canViewDirector()))return NextResponse.json({error:"Director access required"},{status:403});const b=await request.json();const admin=Number(b.admin_idle_minutes),teacher=Number(b.teacher_idle_minutes);if(!Number.isInteger(admin)||!Number.isInteger(teacher)||admin<5||teacher<5||admin>120||teacher>120)return NextResponse.json({error:"Choose 5 to 120 minutes"},{status:400});const {error}=await createCmsServiceClient().from("director_settings").update({admin_idle_minutes:admin,teacher_idle_minutes:teacher,updated_at:new Date().toISOString()}).eq("id",true);return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true})}
