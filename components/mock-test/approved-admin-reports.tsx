"use client";

import { useEffect, useState } from "react";
import { AdminMockShell, AdminBackTitle } from "./approved-shell";

export default function ApprovedAdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  useEffect(() => { fetch("/api/admin/mock-reports").then(r => r.json()).then(d => setReports(d.reports ?? [])); }, []);

  return <AdminMockShell active="results"><div className="ia-content">
    <AdminBackTitle title="Mock Test Reports"/>
    <div className="ia-section-title"><h1 style={{color:"#f5e7bd"}}>Reports & Analytics</h1></div>
    <div className="ia-admin-tests">
      {reports.map(r => <article className="ia-admin-test-card" key={r.id}>
        <span className="status">{r.exam_category} · {r.status}</span>
        <h3>{r.title}</h3>
        <div className="ia-report-mini">
          <div><small>Attempts</small><strong>{r.attempts}</strong></div>
          <div><small>Average</small><strong>{Number(r.average).toFixed(1)}%</strong></div>
          <div><small>Best</small><strong>{Number(r.best).toFixed(1)}%</strong></div>
          <div><small>Accuracy</small><strong>{Number(r.averageAccuracy).toFixed(1)}%</strong></div>
          <div><small>Pass Rate</small><strong>{Number(r.passRate).toFixed(1)}%</strong></div>
        </div>
      </article>)}
    </div>
  </div></AdminMockShell>
}
