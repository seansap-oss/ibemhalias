"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Moon, Search, Sun } from "lucide-react";

type Test = {
  id: string;
  title: string;
  description?: string | null;
  exam_category: string;
  subject?: string | null;
  test_type: string;
  duration_minutes: number;
  total_marks: number;
};

export default function MockTestCenter() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [exam, setExam] = useState("All");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem("ibemhal_mock_theme") === "dark");
    fetch("/api/mock-tests")
      .then(r => r.json())
      .then(d => setTests(d.tests ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("ibemhal_mock_theme", next ? "dark" : "light");
  };

  const exams = useMemo(() => ["All", ...Array.from(new Set(tests.map(t => t.exam_category)))], [tests]);
  const filtered = tests.filter(t => {
    const hay = `${t.title} ${t.subject ?? ""} ${t.exam_category}`.toLowerCase();
    return (exam === "All" || t.exam_category === exam) && hay.includes(query.toLowerCase());
  });

  return (
    <div className={dark ? "mock-shell mock-dark" : "mock-shell"}>
      <div className="mock-wrap">
        <header className="mock-hero">
          <div>
            <p className="mock-kicker">IBEMHAL IAS • MOCK TEST CENTER</p>
            <h1>Practice like the real exam.</h1>
            <p>Timed CBT tests with autosave, negative marking, recovery and detailed review.</p>
          </div>
          <button className="mock-icon-btn" onClick={toggleTheme} aria-label="Toggle light/dark mode">
            {dark ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
        </header>

        <section className="mock-stats">
          <article><strong>{tests.length}</strong><span>Available Tests</span></article>
          <article><strong>CBT</strong><span>Exam-style Runner</span></article>
          <article><strong>Auto</strong><span>Answer Save</span></article>
          <article><strong>Live</strong><span>Instant Result</span></article>
        </section>

        <section className="mock-toolbar">
          <div className="mock-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search exam, subject or test"/></div>
          <div className="mock-chips">
            {exams.map(x => <button key={x} className={exam===x ? "active" : ""} onClick={()=>setExam(x)}>{x}</button>)}
          </div>
        </section>

        <section className="mock-grid">
          {loading && <p>Loading tests…</p>}
          {!loading && filtered.length === 0 && <p>No published tests match this filter.</p>}
          {filtered.map(test => (
            <article className="mock-card" key={test.id}>
              <div className="mock-card-top"><span>{test.exam_category}</span><b>{test.test_type.replaceAll("_"," ")}</b></div>
              <h3>{test.title}</h3>
              <p>{test.description || "Competitive exam practice test."}</p>
              <div className="mock-meta">
                <span>{test.duration_minutes} min</span>
                <span>{test.total_marks} marks</span>
                <span>{test.subject || "General"}</span>
              </div>
              <Link className="mock-primary" href={`/student/mock-tests/${test.id}`}>Start Test</Link>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
