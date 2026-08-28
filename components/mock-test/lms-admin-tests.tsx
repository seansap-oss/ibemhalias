"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";

export default function LmsAdminTests() {
  const [tests, setTests] = React.useState<any[]>([]);
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = () => fetch("/api/admin/mock-tests", { cache: "no-store" }).then(r => r.json()).then(d => setTests(d.tests ?? []));
  React.useEffect(() => { load(); }, []);

  const status = async (id:string, next:string) => {
    setBusy(id);
    try {
      const r = await fetch(`/api/admin/mock-tests/${id}`, {
        method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({status:next})
      });
      const d = await r.json();
      if (!r.ok) return alert(d.error || "Unable to update test.");
      await load();
    } finally { setBusy(null); }
  };

  const filtered = tests.filter(t => `${t.title} ${t.exam_category} ${t.subject ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="lms-mock-body">
      <div className="lms-mock-heading">
        <div><div className="lms-mock-eyebrow">MOCK TESTS</div><h1>All Tests</h1><p>Draft, edit, verify and publish tests from the LMS admin panel.</p></div>
        <Link className="lms-primary" href="/admin/mock-test/tests/new"><PlusCircle className="h-4 w-4"/> Create Test</Link>
      </div>

      <div className="lms-toolbar">
        <div className="lms-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tests…"/></div>
        <span>{filtered.length} test{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <div className="lms-test-grid">
        {filtered.map(test => (
          <article className="lms-test-card" key={test.id}>
            <div className="lms-test-top"><span>{test.exam_category || "Exam"}</span><em>{test.status}</em></div>
            <h3>{test.title}</h3>
            <p>{test.description || "No description yet."}</p>
            <div className="lms-meta"><span>{test.duration_minutes || 0} min</span><span>{test.total_marks || 0} marks</span><span>{test.language || "English"}</span></div>
            <div className="lms-card-actions">
              <Link href={`/admin/mock-test/tests/${test.id}`}>Edit / Questions</Link>
              {test.status === "published"
                ? <button disabled={busy===test.id} onClick={()=>status(test.id,"draft")}>Unpublish</button>
                : <button disabled={busy===test.id} onClick={()=>status(test.id,"published")}>Publish</button>}
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <div className="lms-empty">No tests match your search.</div>}
    </div>
  );
}
