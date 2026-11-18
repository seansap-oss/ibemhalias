"use client";
import * as React from "react";
import {usePathname} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
const post=(url:string,body:object)=>fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).catch(()=>undefined);
export function ActivityTracker(){const path=usePathname();React.useEffect(()=>{
  if(!/^\/(admin|teacher|director|owner|dashboard|student|courses|resources|current-affairs)/.test(path)||/\/login/.test(path))return;
  let last=Date.now(),limit=0,signingOut=false;
  const role=path.startsWith("/teacher")?"teacher":path.startsWith("/admin")||path.startsWith("/director")?"admin":null;
  const touch=()=>{last=Date.now()};
  window.addEventListener("pointerdown",touch);window.addEventListener("keydown",touch);
  void post("/api/activity/session",{action:"start"});
  if(role)void fetch("/api/activity/settings").then(r=>r.json()).then(j=>{limit=(role==="teacher"?j.teacher:j.admin)*60000}).catch(()=>undefined);
  const timer=setInterval(async()=>{
    if(signingOut)return;
    if(role&&limit&&Date.now()-last>=limit){signingOut=true;await post("/api/activity/session",{action:"logout"});if(role==="admin")await fetch("/api/admin/logout",{method:"POST"});const db=createClient();if(db)await db.auth.signOut().catch(()=>undefined);window.location.assign(role==="teacher"?"/teacher/login":"/staff/login");return;}
    if(document.visibilityState==="visible"&&Date.now()-last<60000){void post("/api/activity/session",{action:"heartbeat"});if(/^\/(courses|resources|current-affairs)\//.test(path))void post("/api/activity/view",{target:path});}
  },30000);
  return()=>{clearInterval(timer);window.removeEventListener("pointerdown",touch);window.removeEventListener("keydown",touch)};
},[path]);return null}
