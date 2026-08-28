"use client";

import * as React from "react";
import Link from "next/link";

export default function LmsReviewView({attemptId}:{attemptId:string}) {
  const [data,setData]=React.useState<any>(null);
  const [answerMap,setAnswerMap]=React.useState<Map<string,any>>(new Map());

  React.useEffect(()=>{fetch(`/api/mock-attempts/${attemptId}/review`,{cache:"no-store"}).then(r=>r.json()).then(d=>{setData(d);setAnswerMap(new Map((d.answers??[]).map((a:any)=>[a.question_id,a])))})},[attemptId]);
  if(!data)return <div className="lms-empty">Loading solutions…</div>;
  if(data.error)return <div className="lms-empty">{data.error}</div>;

  return <div className="lms-mock-body"><div className="lms-mock-heading"><div><div className="lms-mock-eyebrow">ANSWER REVIEW</div><h1>Solutions & Explanations</h1><p>Review your submitted responses and the confirmed answer key.</p></div><Link className="lms-secondary" href="/dashboard?view=mock">Back to Tests</Link></div>
    <div className="lms-review-list">{(data.questions??[]).map((row:any,i:number)=>{const q=Array.isArray(row.mock_questions)?row.mock_questions[0]:row.mock_questions;const ans:any=answerMap.get(row.question_id);const selected=new Set(ans?.selected_option_ids??[]);const typed=q?.question_type==="fill_blank"||q?.question_type==="numeric_answer";return <article className="lms-panel" key={row.question_id}>{q?.paragraph_text&&<div className="lms-passage">{q.paragraph_text}</div>}<h3><span>Q{i+1}.</span> {q?.question_text}</h3>{!typed&&<div className="lms-review-options">{(q?.mock_question_options??[]).map((o:any)=><div className={o.is_correct?"correct":selected.has(o.id)?"wrong":""} key={o.id}><b>{o.option_key}</b><span>{o.option_text}</span>{o.is_correct&&<em>Correct</em>}{!o.is_correct&&selected.has(o.id)&&<em>Your answer</em>}</div>)}</div>}{q?.question_type==="fill_blank"&&<div className="lms-typed-review"><span>Your answer: <b>{ans?.text_answer||"—"}</b></span><span>Correct: <b>{q.answer_text||"—"}</b></span></div>}{q?.question_type==="numeric_answer"&&<div className="lms-typed-review"><span>Your answer: <b>{ans?.numeric_answer??"—"}</b></span><span>Correct: <b>{q.answer_numeric??"—"}</b>{Number(q.answer_tolerance||0)>0?` ± ${q.answer_tolerance}`:""}</span></div>}{data.showSolutions&&q?.explanation&&<p className="lms-explanation"><b>Explanation:</b> {q.explanation}</p>}</article>})}</div>
  </div>
}
