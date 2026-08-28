"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, ClipboardCheck, FileQuestion, PlusCircle, Sparkles, Trophy } from "lucide-react";

export default function LmsAdminMockDashboard() {
  const [tests, setTests] = React.useState<any[]>([]);
  const [attempts, setAttempts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/admin/mock-tests", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/admin/mock-results", { cache: "no-store" }).then(r => r.json()).catch(() => ({ attempts: [] })),
    ]).then(([t, a]) => {
      setTests(t.tests ?? []);
      setAttempts(a.attempts ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const published = tests.filter(t => t.status === "published").length;
  const drafts = tests.filter(t => t.status !== "published").length;
  const latest = tests.slice(0, 4);

  return (
    <div className="lms-mock-body">
      <div className="lms-mock-heading">
        <div>
          <div className="lms-mock-eyebrow">D3 · MOCK TEST MANAGEMENT</div>
          <h1>Mock Test Control Center</h1>
          <p>Create tests, build MCQs, import prepared questions, generate draft questions from study material, publish, and review student performance.</p>
        </div>
        <Link className="lms-primary" href="/admin/mock-test/tests/new"><PlusCircle className="h-4 w-4"/> Create Mock Test</Link>
      </div>

      <div className="lms-stat-grid">
        <div className="lms-stat"><span>Total Tests</span><strong>{loading ? "—" : tests.length}</strong><ClipboardCheck/></div>
        <div className="lms-stat"><span>Published</span><strong>{loading ? "—" : published}</strong><Sparkles/></div>
        <div className="lms-stat"><span>Drafts</span><strong>{loading ? "—" : drafts}</strong><FileQuestion/></div>
        <div className="lms-stat"><span>Submitted Attempts</span><strong>{loading ? "—" : attempts.length}</strong><Trophy/></div>
      </div>

      <div className="lms-action-grid">
        <Link href="/admin/mock-test/tests/new" className="lms-action-card">
          <PlusCircle/><div><b>Create a Mock Test</b><span>Build MCQ, multiple-answer, true/false, numeric and paragraph questions.</span></div>
        </Link>
        <Link href="/admin/mock-test/questions" className="lms-action-card">
          <FileQuestion/><div><b>Question Bank</b><span>Review imported and manually created questions before publication.</span></div>
        </Link>
        <Link href="/admin/mock-test/tests" className="lms-action-card">
          <Sparkles/><div><b>Smart Import</b><span>Open a test and import DOCX, TXT, PDF, CSV or generate a draft quiz from source content.</span></div>
        </Link>
        <Link href="/admin/mock-test/reports" className="lms-action-card">
          <BarChart3/><div><b>Reports & Analytics</b><span>View attempts, average score, pass rate and accuracy.</span></div>
        </Link>
      </div>

      <section className="lms-panel">
        <div className="lms-panel-head"><div><h2>Recent Tests</h2><p>Your latest Mock Test records from Supabase.</p></div><Link href="/admin/mock-test/tests">View all</Link></div>
        {latest.length === 0 ? <div className="lms-empty">No tests yet. Create your first Mock Test.</div> :
          <div className="lms-test-grid">{latest.map(test => (
            <article className="lms-test-card" key={test.id}>
              <div className="lms-test-top"><span>{test.exam_category || "Exam"}</span><em>{test.status}</em></div>
              <h3>{test.title}</h3>
              <p>{test.description || "No description yet."}</p>
              <div className="lms-card-actions"><Link href={`/admin/mock-test/tests/${test.id}`}>Edit Test</Link></div>
            </article>
          ))}</div>}
      </section>
    </div>
  );
}
