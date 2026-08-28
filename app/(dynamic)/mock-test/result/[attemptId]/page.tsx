import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import LmsResultView from "@/components/mock-test/lms-result-view";
import "@/styles/mock-test-lms.css";
export default async function Page({params}:{params:Promise<{attemptId:string}>}){const {attemptId}=await params;return <PortalPageShell eyebrow="RESULT" title="Mock Test Result"><LmsMockTheme><LmsResultView attemptId={attemptId}/></LmsMockTheme></PortalPageShell>}
