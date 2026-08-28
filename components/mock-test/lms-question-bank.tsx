"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";

export default function LmsQuestionBank() {
  const [questions,setQuestions]=React.useState<any[]>([]);
  const [q,setQ]=React.useState("");

  React.useEffect(()=>{fetch("/api/admin/mock-questions",{cache:"no-store"}).then(r=>r.json()).then(d=>setQuestions(d.questions??[]))},[]);
  const filtered=questions.filter(x=>`${x.question_text} ${x.exam??""} ${x.subject??""} ${x.topic??""}`.toLowerCase().includes(q.toLowerCase()));

  return <div className="lms-mock-body">
    <div className="lms-mock-heading"><div><div className="lms-mock-eyebrow">QUESTION BANK</div><h1>Question Bank</h1><p>Review all questions created manually or through Smart Import.</p></div><Link className="lms-primary" href="/admin/mock-test/tests/new"><PlusCircle className="h-4 w-4"/> Create Test</Link></div>
    <div className="lms-toolbar"><div className="lms-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search question bank…"/></div><span>{filtered.length} questions</span></div>
    <div className="lms-bank-list">{filtered.map((item:any)=><article key={item.id}><div><b>{item.question_text}</b><span>{item.exam||"General"} · {item.subject||"General"} · {item.topic||"Uncategorised"} · {item.question_type}</span></div><em className={item.verification_status==="verified"?"verified":"needs"}>{item.verification_status}</em></article>)}</div>
    {filtered.length===0&&<div className="lms-empty">No questions found.</div>}
  </div>
}
