"use client";

import { useEffect,useMemo,useState } from "react";
import Link from "next/link";

export default function ApprovedReviewView({attemptId}:{attemptId:string}) {
  const [data,setData]=useState<any>(null);
  useEffect(()=>{fetch(`/api/mock-attempts/${attemptId}/review`).then(r=>r.json()).then(setData)},[attemptId]);
  const amap=useMemo(()=>new Map((data?.answers??[]).map((a:any)=>[a.question_id,a])),[data]);

  if(!data)return <div className="ia-result-wrap">Loading solutions…</div>;
  if(data.error)return <div className="ia-result-wrap">{data.error}</div>;

  return <div className="ia-result-wrap"><div style={{maxWidth:950,margin:"auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div><div style={{color:"#e3c65d",fontSize:11}}>ANSWER REVIEW</div><h1 style={{margin:"5px 0"}}>Solutions & Explanations</h1></div>
      <Link className="ia-outline" href="/mock-test">Back to Tests</Link>
    </div>

    {(data.questions??[]).map((row:any,i:number)=>{
      const q=Array.isArray(row.mock_questions)?row.mock_questions[0]:row.mock_questions;
      const ans:any=amap.get(row.question_id);
      const selected=new Set(ans?.selected_option_ids??[]);
      const typed=q?.question_type==="fill_blank"||q?.question_type==="numeric_answer";

      return <article className="ia-report-card" style={{marginBottom:10}} key={row.question_id}>
        {q?.paragraph_text&&<div className="ia-passage">{q.paragraph_text}</div>}
        <div style={{fontSize:14}}><b style={{color:"#e4c65f"}}>Q{i+1}.</b> {q?.question_text}</div>

        {!typed&&<div style={{display:"grid",gap:7,marginTop:12}}>
          {(q?.mock_question_options??[]).map((o:any)=><div key={o.id} style={{
            padding:9,borderRadius:7,
            border:`1px solid ${o.is_correct?"#5c9265":selected.has(o.id)?"#b64a44":"rgba(255,255,255,.12)"}`,
            background:o.is_correct?"rgba(92,146,101,.13)":selected.has(o.id)?"rgba(182,74,68,.12)":"transparent"
          }}>
            {o.option_key}. {o.option_text}
            {o.is_correct&&<b style={{float:"right",color:"#83b58b"}}>Correct</b>}
            {!o.is_correct&&selected.has(o.id)&&<b style={{float:"right",color:"#e56b64"}}>Your answer</b>}
          </div>)}
        </div>}

        {q?.question_type==="fill_blank"&&<div className="ia-review-typed"><span>Your answer: <b>{ans?.text_answer || "—"}</b></span><span>Correct: <b>{q.answer_text || "—"}</b></span></div>}
        {q?.question_type==="numeric_answer"&&<div className="ia-review-typed"><span>Your answer: <b>{ans?.numeric_answer ?? "—"}</b></span><span>Correct: <b>{q.answer_numeric ?? "—"}</b>{Number(q.answer_tolerance||0)>0?` ± ${q.answer_tolerance}`:""}</span></div>}

        {data.showSolutions&&q?.explanation&&<p style={{color:"#c8d5cf",fontSize:12,lineHeight:1.6}}><b style={{color:"#e1c45e"}}>Explanation:</b> {q.explanation}</p>}
        {(q?.source||q?.source_page)&&<small style={{color:"#8eaaa0"}}>Source: {q.source||"PDF"}{q.source_page?` · page ${q.source_page}`:""}</small>}
      </article>
    })}
  </div></div>
}
