"use client";

import * as React from "react";

export default function LmsAdminReports() {
  const [reports,setReports]=React.useState<any[]>([]);
  React.useEffect(()=>{fetch("/api/admin/mock-reports",{cache:"no-store"}).then(r=>r.json()).then(d=>setReports(d.reports??[]))},[]);

  return <div className="lms-mock-body">
    <div className="lms-mock-heading"><div><div className="lms-mock-eyebrow">ANALYTICS</div><h1>Mock Test Reports</h1><p>Performance overview across published and completed tests.</p></div></div>
    <div className="lms-test-grid">{reports.map(r=><article className="lms-test-card" key={r.id}><div className="lms-test-top"><span>{r.exam_category}</span><em>{r.status}</em></div><h3>{r.title}</h3><div className="lms-report-grid"><div><span>Attempts</span><strong>{r.attempts}</strong></div><div><span>Average</span><strong>{Number(r.average).toFixed(1)}%</strong></div><div><span>Best</span><strong>{Number(r.best).toFixed(1)}%</strong></div><div><span>Accuracy</span><strong>{Number(r.averageAccuracy).toFixed(1)}%</strong></div><div><span>Pass Rate</span><strong>{Number(r.passRate).toFixed(1)}%</strong></div></div></article>)}</div>
    {reports.length===0&&<div className="lms-empty">No report data yet.</div>}
  </div>
}
