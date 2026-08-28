"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Filter, FileCheck2, PencilLine, Award, Clock3, FileText, Timer, Languages } from "lucide-react";
import { StudentMockShell } from "./approved-shell";

type Test = {
  id:string; title:string; description?:string|null; exam_category:string; subject?:string|null;
  test_type:string; duration_minutes:number; total_marks:number; language:string;
};
type Summary = {displayName:string;attempted:number;averageScore:number;bestScore:number;totalSeconds:number};

export default function ApprovedStudentCenter(){
  const [tests,setTests]=useState<Test[]>([]);
  const [summary,setSummary]=useState<Summary>({displayName:"Student",attempted:0,averageScore:0,bestScore:0,totalSeconds:0});
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("All");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    Promise.all([
      fetch("/api/mock-tests").then(r=>r.json()),
      fetch("/api/mock-tests/summary").then(r=>r.json()).catch(()=>({}))
    ]).then(([t,s])=>{
      setTests(t.tests??[]);
      if(s && !s.error) setSummary(s);
    }).finally(()=>setLoading(false));
  },[]);

  const chips=["All","UPSC CSE","State PCS","SSC","Banking","Other Exams"];
  const filtered=useMemo(()=>tests.filter(t=>{
    const hay=`${t.title} ${t.exam_category} ${t.subject??""}`.toLowerCase();
    const qok=hay.includes(query.toLowerCase());
    const e=t.exam_category.toLowerCase();
    const fok=filter==="All" ||
      (filter==="UPSC CSE" && e.includes("upsc")) ||
      (filter==="State PCS" && (e.includes("pcs")||e.includes("state"))) ||
      (filter==="SSC" && e.includes("ssc")) ||
      (filter==="Banking" && e.includes("bank")) ||
      (filter==="Other Exams" && !["upsc","pcs","state","ssc","bank"].some(x=>e.includes(x)));
    return qok&&fok;
  }),[tests,query,filter]);

  const hours=Math.floor(summary.totalSeconds/3600);
  const mins=Math.floor((summary.totalSeconds%3600)/60);

  return <StudentMockShell displayName={summary.displayName||"Student"}>
    <div className="ia-content">
      <div className="ia-stat-grid">
        <div className="ia-stat"><div className="ia-stat-icon"><PencilLine size={17}/></div><div><small>Tests Attempted</small><strong>{summary.attempted}</strong></div></div>
        <div className="ia-stat"><div className="ia-stat-icon"><FileCheck2 size={17}/></div><div><small>Average Score</small><strong>{Math.round(summary.averageScore)}%</strong></div></div>
        <div className="ia-stat"><div className="ia-stat-icon"><Award size={17}/></div><div><small>Best Score</small><strong>{Math.round(summary.bestScore)}%</strong></div></div>
        <div className="ia-stat"><div className="ia-stat-icon"><Clock3 size={17}/></div><div><small>Total Time</small><strong>{hours}h {mins}m</strong></div></div>
      </div>

      <div className="ia-section-title"><h2>Available Mock Tests</h2></div>
      <div className="ia-toolbar">
        <div className="ia-chips">{chips.map(c=><button className={`ia-chip ${filter===c?"active":""}`} onClick={()=>setFilter(c)} key={c}>{c}</button>)}</div>
        <div style={{display:"flex",gap:7}}><div className="ia-search"><Search size={14}/><input placeholder="Search tests..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="ia-chip" title="Filters"><Filter size={14}/></button></div>
      </div>

      <div className="ia-test-list">
        {loading&&<div className="ia-empty">Loading mock tests…</div>}
        {!loading&&filtered.length===0&&<div className="ia-empty">No published tests match this filter.</div>}
        {filtered.map(test=><article className="ia-test-card" key={test.id}>
          <div className="ia-test-badge">♛</div>
          <div>
            <h3>{test.title}</h3>
            <div className="ia-tag-row"><span className="ia-tag">{test.exam_category}</span>{test.subject&&<span className="ia-tag">{test.subject}</span>}<span className="ia-tag">{test.test_type.replaceAll("_"," ")}</span></div>
            <div className="ia-meta-row"><span><FileText size={11}/> {test.total_marks} Marks</span><span><Timer size={11}/> {test.duration_minutes} Minutes</span><span><Languages size={11}/> {test.language||"English"}</span></div>
          </div>
          <div className="ia-card-actions"><Link className="ia-primary" href={`/student/mock-tests/${test.id}`}>Start Test</Link><Link className="ia-outline" href={`/student/mock-tests/${test.id}`}>View Details</Link></div>
        </article>)}
      </div>
    </div>
  </StudentMockShell>
}
