import { NextResponse } from "next/server";
import { getMockTestAdminClient } from "@/lib/mock-test/server";
import { requireStudent } from "@/lib/mock-test/student";

export async function GET(_req:Request,context:{params:Promise<{attemptId:string}>}){
  const user=await requireStudent();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {attemptId}=await context.params;const supabase=getMockTestAdminClient();
  const {data:attempt,error}=await supabase.from("mock_attempts").select("*, mock_tests(title,show_answers_after_submit,show_solutions)").eq("id",attemptId).eq("student_id",user.id).single();
  if(error||!attempt)return NextResponse.json({error:"Not found"},{status:404});
  if(attempt.status!=="submitted")return NextResponse.json({error:"Not submitted"},{status:409});
  const {data:all}=await supabase.from("mock_attempts").select("id,score,percentage").eq("test_id",attempt.test_id).eq("status","submitted");
  const rows=all??[];const scores=rows.map((x:any)=>Number(x.score||0));const averageScore=scores.length?scores.reduce((a:number,b:number)=>a+b,0)/scores.length:null;
  const ordered=[...rows].sort((a:any,b:any)=>Number(b.score||0)-Number(a.score||0));const rank=Math.max(1,ordered.findIndex((x:any)=>x.id===attempt.id)+1);
  const totalParticipants=ordered.length;const percentile=totalParticipants>1?((totalParticipants-rank)/(totalParticipants-1))*100:100;
  return NextResponse.json({attempt,averageScore,rank,totalParticipants,percentile});
}
