import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import LmsReviewView from "@/components/mock-test/lms-review-view";
import "@/styles/mock-test-lms.css";
export default async function Page({params}:{params:Promise<{attemptId:string}>}){const {attemptId}=await params;return <PortalPageShell eyebrow="REVIEW" title="Answers & Solutions"><LmsMockTheme><LmsReviewView attemptId={attemptId}/></LmsMockTheme></PortalPageShell>}
