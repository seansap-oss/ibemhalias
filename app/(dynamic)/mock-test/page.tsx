import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import LmsStudentCenter from "@/components/mock-test/lms-student-center";
import "@/styles/mock-test-lms.css";

export default function Page(){
  return <PortalPageShell eyebrow="A7" title="Mock Tests" description="Timed practice tests, instant results, answer review and performance tracking.">
    <LmsMockTheme><LmsStudentCenter/></LmsMockTheme>
  </PortalPageShell>
}
