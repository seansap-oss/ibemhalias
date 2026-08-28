"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun, Menu, Flag, Eraser, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  question_text: string;
  marks: number;
  negative_marks: number;
  options: { id: string; option_key: string; option_text: string }[];
};

type Props = { testId: string };

export default function TestRunner({ testId }: Props) {
  const router = useRouter();
  const [boot, setBoot] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [review, setReview] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [dark, setDark] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentStartRef = useRef(Date.now());

  useEffect(() => {
    setDark(localStorage.getItem("ibemhal_mock_theme") === "dark");
    fetch(`/api/mock-tests/${testId}/start`, { method: "POST" })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Unable to start test");
        return d;
      })
      .then(d => {
        setBoot(d);
        const initial: Record<string, string[]> = {};
        const marked: Record<string, boolean> = {};
        for (const row of d.savedAnswers ?? []) {
          initial[row.question_id] = row.selected_option_ids ?? [];
          marked[row.question_id] = Boolean(row.marked_for_review);
        }
        setAnswers(initial);
        setReview(marked);
        const started = new Date(d.attempt.started_at).getTime();
        const duration = Number(d.test.duration_minutes) * 60;
        const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000));
        setSecondsLeft(Math.max(0, duration - elapsed));
      })
      .catch(err => alert(err.message));
  }, [testId]);

  const save = useCallback(async (questionId: string, nextIds: string[], marked: boolean) => {
    if (!boot?.attempt?.id) return;
    setSaving(true);
    const spent = Math.max(0, Math.floor((Date.now() - currentStartRef.current) / 1000));
    try {
      await fetch(`/api/mock-attempts/${boot.attempt.id}/answer`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId,
          selectedOptionIds: nextIds,
          markedForReview: marked,
          timeSpentSeconds: spent,
        }),
      });
    } finally {
      setSaving(false);
    }
  }, [boot]);

  const submit = useCallback(async () => {
    if (!boot?.attempt?.id) return;
    const r = await fetch(`/api/mock-attempts/${boot.attempt.id}/submit`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) return alert(d.error || "Unable to submit");
    router.replace(`/student/mock-tests/result/${boot.attempt.id}`);
  }, [boot, router]);

  useEffect(() => {
    if (!boot) return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const timer = window.setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [boot, secondsLeft, submit]);

  const questions: Question[] = boot?.questions ?? [];
  const current = questions[index];
  const status = useMemo(() => questions.map(q => {
    const answered = (answers[q.id]?.length ?? 0) > 0;
    const marked = !!review[q.id];
    if (answered && marked) return "answered-marked";
    if (marked) return "marked";
    if (answered) return "answered";
    return "not-answered";
  }), [questions, answers, review]);

  if (!boot || !current) return <div className="mock-shell"><div className="mock-wrap"><p>Preparing secure test session…</p></div></div>;

  const choose = (id: string) => {
    const next = [id];
    setAnswers(a => ({ ...a, [current.id]: next }));
    save(current.id, next, !!review[current.id]);
  };

  const mark = () => {
    const next = !review[current.id];
    setReview(r => ({ ...r, [current.id]: next }));
    save(current.id, answers[current.id] ?? [], next);
  };

  const clear = () => {
    setAnswers(a => ({ ...a, [current.id]: [] }));
    save(current.id, [], !!review[current.id]);
  };

  const move = (nextIndex: number) => {
    currentStartRef.current = Date.now();
    setIndex(Math.min(Math.max(0, nextIndex), questions.length - 1));
    setPaletteOpen(false);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className={dark ? "mock-shell mock-dark" : "mock-shell"}>
      <div className="runner">
        <header className="runner-top">
          <div><small>IBEMHAL IAS • LIVE CBT</small><h2>{boot.test.title}</h2></div>
          <div className="runner-actions">
            <span className={secondsLeft < 300 ? "timer danger" : "timer"}>{mins}:{String(secs).padStart(2,"0")}</span>
            <span className="save-state">{saving ? "Saving…" : "Saved"}</span>
            <button className="mock-icon-btn" onClick={() => {
              const next=!dark; setDark(next); localStorage.setItem("ibemhal_mock_theme",next?"dark":"light");
            }}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button>
            <button className="mock-icon-btn runner-menu" onClick={()=>setPaletteOpen(v=>!v)}><Menu size={18}/></button>
            <button className="mock-danger" onClick={() => confirm("Finish and submit this test?") && submit()}>Finish Test</button>
          </div>
        </header>

        <main className="runner-body">
          <section className="question-panel">
            <div className="question-head">
              <span>Question {index + 1} of {questions.length}</span>
              <span>+{current.marks} / −{current.negative_marks}</span>
            </div>
            <h3>{current.question_text}</h3>
            <div className="option-list">
              {current.options.map(o => (
                <button key={o.id} className={(answers[current.id]??[]).includes(o.id) ? "selected" : ""} onClick={()=>choose(o.id)}>
                  <b>{o.option_key}</b><span>{o.option_text}</span>
                </button>
              ))}
            </div>

            <div className="question-tools">
              <button onClick={clear}><Eraser size={16}/> Clear Response</button>
              <button className={review[current.id] ? "marked" : ""} onClick={mark}><Flag size={16}/> Mark for Review</button>
            </div>

            <div className="runner-nav">
              <button disabled={index===0} onClick={()=>move(index-1)}><ChevronLeft size={17}/> Previous</button>
              <button className="mock-primary" onClick={()=>move(index+1)} disabled={index===questions.length-1}>Save & Next <ChevronRight size={17}/></button>
            </div>
          </section>

          <aside className={paletteOpen ? "palette open" : "palette"}>
            <h4>Question Palette</h4>
            <div className="palette-legend">
              <span><i className="answered"/>Answered</span>
              <span><i className="not-answered"/>Not Answered</span>
              <span><i className="marked"/>Review</span>
              <span><i className="answered-marked"/>Ans + Review</span>
            </div>
            <div className="palette-grid">
              {questions.map((q, i) => <button key={q.id} onClick={()=>move(i)} className={`${status[i]} ${i===index?"current":""}`}>{i+1}</button>)}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
