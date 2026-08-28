"use client";

import { useEffect, useMemo, useState } from "react";

export default function ReviewView({ attemptId }: { attemptId: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`/api/mock-attempts/${attemptId}/review`).then(r=>r.json()).then(setData); }, [attemptId]);

  const answerMap = useMemo(() => new Map((data?.answers ?? []).map((a:any)=>[a.question_id,a])), [data]);

  if (!data) return <div className="mock-shell"><div className="mock-wrap"><p>Loading review…</p></div></div>;
  if (data.error) return <div className="mock-shell"><div className="mock-wrap"><p>{data.error}</p></div></div>;

  return (
    <div className="mock-shell">
      <div className="mock-wrap review-page">
        <p className="mock-kicker">ANSWER REVIEW</p>
        <h1>Solutions & Explanations</h1>
        {(data.questions ?? []).map((row:any, idx:number) => {
          const q = Array.isArray(row.mock_questions) ? row.mock_questions[0] : row.mock_questions;
          const options = q?.mock_question_options ?? [];
          const ans:any = answerMap.get(row.question_id);
          const selected = new Set(ans?.selected_option_ids ?? []);
          return (
            <article className="review-card" key={row.question_id}>
              <div className="review-title"><b>Q{idx+1}.</b><span>{q?.question_text}</span></div>
              <div className="review-options">
                {options.map((o:any) => (
                  <div key={o.id} className={o.is_correct ? "correct" : selected.has(o.id) ? "wrong" : ""}>
                    <b>{o.option_key}</b> {o.option_text}
                    {o.is_correct && <span>Correct</span>}
                    {!o.is_correct && selected.has(o.id) && <span>Your answer</span>}
                  </div>
                ))}
              </div>
              {data.showSolutions && q?.explanation && <p className="explanation"><b>Explanation:</b> {q.explanation}</p>}
              {(q?.source || q?.source_page) && <small>Source: {q.source || "PDF"}{q.source_page ? ` • page ${q.source_page}` : ""}</small>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
