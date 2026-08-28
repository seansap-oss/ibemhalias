"use client";
import { useEffect,useState } from "react";
import { AdminMockShell, AdminBackTitle } from "./approved-shell";
export default function ApprovedQuestionBank(){
  const [qs,setQs]=useState<any[]>([]);
  useEffect(()=>{fetch("/api/admin/mock-questions").then(r=>r.json()).then(d=>setQs(d.questions??[]))},[]);
  return <AdminMockShell active="questions"><div className="ia-content"><AdminBackTitle title="Question Bank"/><div className="ia-section-title"><h1 style={{color:"#f5e7bd"}}>Question Bank</h1><span style={{color:"#e2c55f",fontSize:11}}>{qs.length} questions</span></div><div className="ia-bank-list">{qs.map((q:any)=><div className="ia-bank-row" key={q.id}><div><p>{q.question_text}</p><small>{q.exam||"General"} · {q.subject||"General"} · {q.topic||"Uncategorised"} · {q.question_type}</small></div><span style={{color:"#e4c65e",fontSize:10}}>{q.verification_status}</span></div>)}</div></div></AdminMockShell>
}
