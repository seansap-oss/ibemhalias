import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import LmsStudentCenter from "@/components/mock-test/lms-student-center";
import "@/styles/mock-test-lms.css";

export default function Page(){
  return <PortalPageShell eyebrow="A7" title="Mock Tests" description="Timed practice tests, instant results, answer review and performance tracking.">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-black text-[#14256f]">Dedicated Online CBT Exam Portal</p>
        <p className="text-xs text-slate-600">Launch our standalone high-speed Exam Portal with instant Single Sign-On.</p>
      </div>
      <a href="/api/exam-portal/sso" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#14256f] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e3594]">
        Open Exam Portal ↗
      </a>
    </div>
    <LmsMockTheme><LmsStudentCenter/></LmsMockTheme>
  </PortalPageShell>
}
