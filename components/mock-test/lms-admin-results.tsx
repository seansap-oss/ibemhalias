"use client";

import * as React from "react";

export default function LmsAdminResults() {
  const [attempts,setAttempts]=React.useState<any[]>([]);
  React.useEffect(()=>{fetch("/api/admin/mock-results",{cache:"no-store"}).then(r=>r.json()).then(d=>setAttempts(d.attempts??[]))},[]);

  return <div className="lms-mock-body">
    <div className="lms-mock-heading"><div><div className="lms-mock-eyebrow">RESULTS</div><h1>Student Results</h1><p>Submitted Mock Test attempts and scoring details.</p></div></div>
    <section className="lms-panel lms-table-wrap"><table className="lms-table"><thead><tr><th>Test</th><th>Student</th><th>Score</th><th>%</th><th>Accuracy</th><th>Correct</th><th>Incorrect</th><th>Time</th><th>Submitted</th></tr></thead><tbody>{attempts.map(a=>{const t=Array.isArray(a.mock_tests)?a.mock_tests[0]:a.mock_tests;return <tr key={a.id}><td><b>{t?.title||"Mock Test"}</b><small>{t?.exam_category||""}</small></td><td>{String(a.student_id).slice(0,8)}…</td><td>{Number(a.score||0).toFixed(2)} / {Number(a.total_marks||0).toFixed(0)}</td><td>{Number(a.percentage||0).toFixed(1)}%</td><td>{Number(a.accuracy||0).toFixed(1)}%</td><td>{a.correct_count??0}</td><td>{a.incorrect_count??0}</td><td>{Math.floor(Number(a.elapsed_seconds||0)/60)} min</td><td>{a.submitted_at?new Date(a.submitted_at).toLocaleString():"—"}</td></tr>})}</tbody></table></section>
    {attempts.length===0&&<div className="lms-empty">No submitted attempts yet.</div>}
  </div>
}
