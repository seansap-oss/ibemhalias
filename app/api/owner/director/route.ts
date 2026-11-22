import {NextRequest,NextResponse} from "next/server";
import {randomBytes} from "node:crypto";
import {hasOwnerSession} from "@/lib/super-admin";
import {createCmsServiceClient} from "@/lib/supabase/cms-server";
export const runtime="nodejs";
export async function GET(){
  if(!(await hasOwnerSession())) return NextResponse.json({error:"Owner access required"},{status:403});
  const {data,error}=await createCmsServiceClient().from("profiles")
    .select("id,email,full_name,role,created_at")
    .in("role",["director","admin"])
    .order("created_at",{ascending:false});
  if(error) return NextResponse.json({error:error.message},{status:500});
  const db=createCmsServiceClient();
  const accounts=await Promise.all((data||[]).map(async account=>{
    const {data:auth}=await db.auth.admin.getUserById(account.id);
    return {...account,paused:auth.user?.app_metadata?.paused===true};
  }));
  return NextResponse.json({ok:true,accounts},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:NextRequest){
  if(!(await hasOwnerSession()))return NextResponse.json({error:"Owner access required"},{status:403});
  try{
    const b=await request.json();
    const email=String(b.email||"").trim().toLowerCase(),name=String(b.name||"").trim(),role=b.role==="admin"?"admin":"director";
    if(!/^\S+@\S+\.\S+$/.test(email)||name.length<2)return NextResponse.json({error:"Staff name and email required"},{status:400});
    const suppliedPassword=String(b.password||"");
    if(suppliedPassword&&suppliedPassword.length<8)return NextResponse.json({error:"Password must be at least 8 characters"},{status:400});
    const password=suppliedPassword||randomBytes(12).toString("base64url");
    const db=createCmsServiceClient();
    const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{role},user_metadata:{full_name:name}});
    if(error||!data.user)throw error||new Error("Unable to create staff account");
    const {error:profileError}=await db.from("profiles").upsert({id:data.user.id,email,full_name:name,role},{onConflict:"id"});
    if(profileError){await db.auth.admin.deleteUser(data.user.id);throw profileError;}
    return NextResponse.json({ok:true,email,...(suppliedPassword?{}:{temporaryPassword:password})},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to create staff account"},{status:500});}
}

export async function PATCH(request:NextRequest){
  if(!(await hasOwnerSession()))return NextResponse.json({error:"Owner access required"},{status:403});
  try{
    const {id,password,action}=await request.json();
    if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Valid staff account required"},{status:400});
    const db=createCmsServiceClient();
    const {data:profile,error:profileError}=await db.from("profiles").select("id,email,role").eq("id",id).in("role",["director","admin"]).maybeSingle();
    if(profileError)throw profileError;
    if(!profile)return NextResponse.json({error:"Staff account not found"},{status:404});
    if(action==="pause"||action==="resume"){
      const {data:auth,error:readError}=await db.auth.admin.getUserById(id);
      if(readError||!auth.user)throw readError||new Error("Staff login not found");
      const paused=action==="pause";
      const {error}=await db.auth.admin.updateUserById(id,{
        ban_duration:paused?"876000h":"none",
        app_metadata:{...auth.user.app_metadata,paused},
      });
      if(error)throw error;
      return NextResponse.json({ok:true,email:profile.email,paused},{headers:{"Cache-Control":"private, no-store"}});
    }
    if(typeof password!=="string"||password.length<8)return NextResponse.json({error:"Enter a password of at least 8 characters"},{status:400});
    const {error}=await db.auth.admin.updateUserById(id,{password});
    if(error)throw error;
    return NextResponse.json({ok:true,email:profile.email},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to reset staff password"},{status:500});}
}

export async function PUT(request:NextRequest){
  if(!(await hasOwnerSession()))return NextResponse.json({error:"Owner access required"},{status:403});
  try{
    const b=await request.json();
    const id=String(b.id||""),email=String(b.email||"").trim().toLowerCase(),name=String(b.name||"").trim();
    const role=b.role==="admin"?"admin":b.role==="director"?"director":null;
    if(!/^[0-9a-f-]{36}$/i.test(id)||!/^\S+@\S+\.\S+$/.test(email)||name.length<2||!role)return NextResponse.json({error:"Valid name, email and role required"},{status:400});
    const db=createCmsServiceClient();
    const {data:before,error:readError}=await db.from("profiles").select("id,email,full_name,role").eq("id",id).in("role",["director","admin"]).maybeSingle();
    if(readError)throw readError;
    if(!before)return NextResponse.json({error:"Staff account not found"},{status:404});
    const {data:authBefore,error:authReadError}=await db.auth.admin.getUserById(id);
    if(authReadError||!authBefore.user)throw authReadError||new Error("Staff login not found");
    const {error:authError}=await db.auth.admin.updateUserById(id,{email,email_confirm:true,user_metadata:{full_name:name},app_metadata:{...authBefore.user.app_metadata,role}});
    if(authError)throw authError;
    const {error:profileError}=await db.from("profiles").update({email,full_name:name,role}).eq("id",id);
    if(profileError){
      await db.auth.admin.updateUserById(id,{email:before.email,email_confirm:true,user_metadata:{full_name:before.full_name},app_metadata:authBefore.user.app_metadata});
      throw profileError;
    }
    return NextResponse.json({ok:true,email},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update staff account"},{status:500});}
}

export async function DELETE(request:NextRequest){
  if(!(await hasOwnerSession()))return NextResponse.json({error:"Owner access required"},{status:403});
  try{
    const {id}=await request.json();
    if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Valid staff account required"},{status:400});
    const db=createCmsServiceClient();
    const {data:profile,error:readError}=await db.from("profiles").select("id,role").eq("id",id).in("role",["director","admin"]).maybeSingle();
    if(readError)throw readError;
    if(!profile)return NextResponse.json({error:"Staff account not found"},{status:404});
    const {error:authError}=await db.auth.admin.deleteUser(id);
    if(authError)throw authError;
    const {error:profileError}=await db.from("profiles").delete().eq("id",id);
    if(profileError)throw profileError;
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to delete staff account"},{status:500});}
}
