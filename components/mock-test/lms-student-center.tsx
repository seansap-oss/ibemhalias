"use client";

import * as React from "react";
import Link from "next/link";
import { Award, Clock3, FileCheck2, Search, Timer, Trophy } from "lucide-react";

export default function LmsStudentCenter() {
  const [tests,setTests]=React.useState<any[]>([]);
  const [summary,setSummary]=React.useState<any>({displayName:"Student",attempted:0,averageScore:0,bestScore:0,totalSeconds:0});
  const [query,setQuery]=React.useState("");
  const [filter,setFilter]=React.useState("All");
  const [loading,setLoading]=React.useState(true);
  const [unauthorized,setUnauthorized]=React.useState(false);

  React.useEffect(()=>{
    Promise.all([
      fetch("/api/mock-tests",{cache:"no-store"}).then(async r=>{if(r.status===401){setUnauthorized(true);return {tests:[]}};return r.json()}),
      fetch("/api/mock-tests/summary",{cache:"no-store"}).then(async r=>(r.ok ? await r.json() : {} as any)).catch(()=>({} as any))
    ]).then(([t,s]:[any,any])=>{setTests(t.tests??[]);if(s&&!s.error)setSummary((x:any)=>({...x,...s}))}).finally(()=>setLoading(false));
  },[]);

  const chips=["All","UPSC CSE","State PCS","SSC","Banking","Other Exams"];
  const filtered=tests.filter(t=>{
    const hay=`${t.title} ${t.exam_category} ${t.subject??""}`.toLowerCase();
    const e=String(t.exam_category||"").toLowerCase();
    const qok=hay.includes(query.toLowerCase());
    const fok=filter==="All"||(filter==="UPSC CSE"&&e.includes("upsc"))||(filter==="State PCS"&&(e.includes("pcs")||e.includes("state")))||(filter==="SSC"&&e.includes("ssc"))||(filter==="Banking"&&e.includes("bank"))||(filter==="Other Exams"&&!["upsc","pcs","state","ssc","bank"].some(x=>e.includes(x)));
    return qok&&fok;
  });

  const hours=Math.floor(Number(summary.totalSeconds||0)/3600);
  const mins=Math.floor((Number(summary.totalSeconds||0)%3600)/60);

  if(unauthorized)return <div className="lms-login-gate"><Trophy/><h2>Student login required</h2><p>Sign in to access Mock Tests, saved attempts and results.</p><Link className="lms-primary" href="/login">Student Login</Link></div>;

  return <div className="lms-mock-body lms-student-body">
    <div className="lms-stat-grid">
      <div className="lms-stat"><span>Tests Attempted</span><strong>{summary.attempted||0}</strong><FileCheck2/></div>
      <div className="lms-stat"><span>Average Score</span><strong>{Math.round(Number(summary.averageScore||0))}%</strong><Award/></div>
      <div className="lms-stat"><span>Best Score</span><strong>{Math.round(Number(summary.bestScore||0))}%</strong><Trophy/></div>
      <div className="lms-stat"><span>Total Time</span><strong>{hours}h {mins}m</strong><Clock3/></div>
    </div>

    <div className="lms-panel">
      <div className="lms-panel-head"><div><h2>Available Mock Tests</h2><p>Choose a published test and begin your timed attempt.</p></div></div>
      <div className="lms-student-toolbar">
        <div className="lms-chip-row">{chips.map(c=><button key={c} className={filter===c?"active":""} onClick={()=>setFilter(c)}>{c}</button>)}</div>
        <div className="lms-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tests…"/></div>
      </div>

      {loading?<div className="lms-empty">Loading Mock Tests…</div>:filtered.length===0?<div className="lms-empty">No published tests match this filter.</div>:
      <div className="lms-student-tests">{filtered.map(test=><article key={test.id}>
        <div className="lms-exam-mark">Ib</div>
        <div className="lms-student-test-copy"><div className="lms-tag-row"><span>{test.exam_category}</span>{test.subject&&<span>{test.subject}</span>}<span>{String(test.test_type||"test").replaceAll("_"," ")}</span></div><h3>{test.title}</h3><p>{test.description||"Timed Mock Test"}</p><div className="lms-meta"><span>{test.total_marks||0} marks</span><span><Timer/> {test.duration_minutes||0} minutes</span><span>{test.language||"English"}</span></div></div>
        <div className="lms-student-actions"><Link className="lms-primary" href={`/mock-test/${test.id}`}>Start Test</Link></div>
      </article>)}</div>}
    </div>
  </div>
}
