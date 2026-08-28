"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ApprovedResultView({attemptId}:{attemptId:string}){
  const [data,setData]=useState<any>(null);
  useEffect(()=>{fetch(`/api/mock-attempts/${attemptId}/result`).then(r=>r.json()).then(setData)},[attemptId]);
  if(!data?.attempt)return <div className="ia-result-wrap">Loading result…</div>;
  const a=data.attempt;
  const pct=Math.max(0,Math.min(100,Number(a.percentage)||0));
  const mins=Math.floor(Number(a.elapsed_seconds||0)/60),secs=Number(a.elapsed_seconds||0)%60;
  return <div className="ia-result-wrap">
    <div className="ia-result-grid">
      <section className="ia-result-card">
        <h1>Test Completed!</h1>
        <h2>{a.mock_tests?.title||"Mock Test"}</h2>
        <div className="ia-score-label">Your Score</div>
        <div className="ia-score">{Number(a.score||0).toFixed(2)} <small>/ {Number(a.total_marks||0).toFixed(0)}</small></div>
        <div className="ia-score-percent">({pct.toFixed(1)}%)</div>
        <div className="ia-result-metrics">
          <div><strong>{a.correct_count??0}</strong><span>Correct</span></div>
          <div><strong className="bad">{a.incorrect_count??0}</strong><span>Incorrect</span></div>
          <div><strong>{a.unattempted_count??0}</strong><span>Unattempted</span></div>
          <div><strong>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</strong><span>Time Taken</span></div>
        </div>
        <div className="ia-result-buttons"><Link className="ia-outline" href={`/mock-test/review/${attemptId}`}>View Solutions</Link><a className="ia-outline" href="#performance">View Performance</a></div>
      </section>

      <section className="ia-report-card" id="performance">
        <div className="ia-tabs"><button className="active">Overview</button><button title="Advanced section analysis comes in the analytics stage">Sectional Analysis</button><button title="Advanced question analysis comes in the analytics stage">Question Analysis</button><button title="Advanced time analysis comes in the analytics stage">Time Analysis</button></div>
        <div className="ia-report-overview">
          <div className="ia-score-ring" style={{"--score-angle":`${pct*3.6}deg`} as any}><div><strong>{pct.toFixed(0)}%</strong><span>Your Score</span></div></div>
          <div className="ia-report-stats">
            <div><small>Percentile</small><strong>{data.percentile==null?"—":Number(data.percentile).toFixed(1)}</strong></div>
            <div><small>Accuracy</small><strong>{Number(a.accuracy||0).toFixed(0)}%</strong></div>
            <div><small>Rank</small><strong>{data.rank?`${data.rank} / ${data.totalParticipants}`:"—"}</strong></div>
            <div><small>Attempts</small><strong>{(a.correct_count??0)+(a.incorrect_count??0)}</strong></div>
            <div className="ia-average"><small>Score vs Average</small><div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10}}><b style={{color:"#e2c45f"}}>You: {Number(a.score||0).toFixed(1)}</b><span>Average: {data.averageScore==null?"—":Number(data.averageScore).toFixed(1)}</span></div><div className="ia-average-line"><i style={{width:`${pct}%`}}/></div></div>
          </div>
        </div>
      </section>
    </div>
  </div>
}
