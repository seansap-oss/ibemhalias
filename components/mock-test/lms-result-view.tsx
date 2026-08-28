"use client";

import * as React from "react";
import Link from "next/link";
import { Award, CheckCircle2, Clock3, Target, XCircle } from "lucide-react";

export default function LmsResultView({attemptId}:{attemptId:string}) {
  const [data,setData]=React.useState<any>(null);
  React.useEffect(()=>{fetch(`/api/mock-attempts/${attemptId}/result`,{cache:"no-store"}).then(r=>r.json()).then(setData)},[attemptId]);
  if(!data?.attempt)return <div className="lms-empty">Loading result…</div>;

  const a=data.attempt,pct=Math.max(0,Math.min(100,Number(a.percentage)||0));
  return <div className="lms-mock-body"><div className="lms-result-hero"><Award/><div><span>TEST COMPLETED</span><h1>{a.mock_tests?.title||"Mock Test"}</h1><p>Your Score</p><strong>{Number(a.score||0).toFixed(2)} <small>/ {Number(a.total_marks||0).toFixed(0)}</small></strong><em>{pct.toFixed(1)}%</em></div></div>
    <div className="lms-result-stats"><div><CheckCircle2/><span>Correct</span><strong>{a.correct_count??0}</strong></div><div><XCircle/><span>Incorrect</span><strong>{a.incorrect_count??0}</strong></div><div><Target/><span>Unattempted</span><strong>{a.unattempted_count??0}</strong></div><div><Clock3/><span>Time</span><strong>{Math.floor(Number(a.elapsed_seconds||0)/60)} min</strong></div></div>
    <section className="lms-panel"><div className="lms-panel-head"><div><h2>Performance Overview</h2><p>Accuracy, percentile and ranking from submitted attempts.</p></div></div><div className="lms-performance"><div className="lms-score-ring" style={{"--score":`${pct*3.6}deg`} as React.CSSProperties}><div><strong>{pct.toFixed(0)}%</strong><span>Your Score</span></div></div><div className="lms-report-grid"><div><span>Accuracy</span><strong>{Number(a.accuracy||0).toFixed(1)}%</strong></div><div><span>Percentile</span><strong>{data.percentile==null?"—":Number(data.percentile).toFixed(1)}</strong></div><div><span>Rank</span><strong>{data.rank?`${data.rank} / ${data.totalParticipants}`:"—"}</strong></div><div><span>Average Score</span><strong>{data.averageScore==null?"—":Number(data.averageScore).toFixed(1)}</strong></div></div></div><div className="lms-heading-actions"><Link className="lms-primary" href={`/mock-test/review/${attemptId}`}>View Solutions</Link><Link className="lms-secondary" href="/dashboard?view=mock">Back to Mock Tests</Link></div></section>
  </div>
}
