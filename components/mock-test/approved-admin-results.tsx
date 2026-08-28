"use client";

import { useEffect, useState } from "react";
import { AdminMockShell, AdminBackTitle } from "./approved-shell";

export default function ApprovedAdminResults() {
  const [attempts, setAttempts] = useState<any[]>([]);
  useEffect(() => { fetch("/api/admin/mock-results").then(r => r.json()).then(d => setAttempts(d.attempts ?? [])); }, []);

  return <AdminMockShell active="results"><div className="ia-content">
    <AdminBackTitle title="Mock Test Results"/>
    <div className="ia-section-title"><h1 style={{color:"#f5e7bd"}}>Results</h1><span style={{color:"#e2c55f",fontSize:11}}>{attempts.length} submitted attempts</span></div>
    <div className="ia-panel ia-table-wrap">
      <table className="ia-table">
        <thead><tr><th>Test</th><th>Student</th><th>Score</th><th>%</th><th>Accuracy</th><th>Correct</th><th>Incorrect</th><th>Time</th><th>Submitted</th></tr></thead>
        <tbody>{attempts.map(a => {
          const t = Array.isArray(a.mock_tests) ? a.mock_tests[0] : a.mock_tests;
          const mins = Math.floor(Number(a.elapsed_seconds || 0) / 60);
          return <tr key={a.id}>
            <td><b>{t?.title || "Mock Test"}</b><small>{t?.exam_category || ""}</small></td>
            <td>{String(a.student_id).slice(0,8)}…</td>
            <td>{Number(a.score||0).toFixed(2)} / {Number(a.total_marks||0).toFixed(0)}</td>
            <td>{Number(a.percentage||0).toFixed(1)}%</td>
            <td>{Number(a.accuracy||0).toFixed(1)}%</td>
            <td>{a.correct_count ?? 0}</td>
            <td className="ia-bad">{a.incorrect_count ?? 0}</td>
            <td>{mins} min</td>
            <td>{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}</td>
          </tr>
        })}</tbody>
      </table>
    </div>
  </div></AdminMockShell>
}
