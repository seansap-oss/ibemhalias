"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ResultView({ attemptId }: { attemptId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/mock-attempts/${attemptId}/result`)
      .then(r => r.json())
      .then(setData);
  }, [attemptId]);

  if (!data?.attempt) return <div className="mock-shell"><div className="mock-wrap"><p>Loading result…</p></div></div>;
  const a = data.attempt;
  const mins = Math.floor(Number(a.elapsed_seconds || 0) / 60);

  return (
    <div className="mock-shell">
      <div className="mock-wrap result-page">
        <p className="mock-kicker">IBEMHAL IAS • RESULT</p>
        <h1>{a.mock_tests?.title || "Mock Test Result"}</h1>
        <div className="result-score"><strong>{Number(a.score).toFixed(2)}</strong><span>/ {Number(a.total_marks).toFixed(2)}</span></div>
        <div className="mock-stats">
          <article><strong>{Number(a.percentage).toFixed(1)}%</strong><span>Percentage</span></article>
          <article><strong>{a.correct_count}</strong><span>Correct</span></article>
          <article><strong>{a.incorrect_count}</strong><span>Incorrect</span></article>
          <article><strong>{a.unattempted_count}</strong><span>Unattempted</span></article>
          <article><strong>{Number(a.accuracy).toFixed(1)}%</strong><span>Accuracy</span></article>
          <article><strong>{mins} min</strong><span>Time Taken</span></article>
        </div>
        <div className="result-actions">
          <Link className="mock-primary" href={`/student/mock-tests/review/${attemptId}`}>View Solutions</Link>
          <Link className="mock-secondary" href="/student/mock-tests">Back to Mock Tests</Link>
        </div>
      </div>
    </div>
  );
}
