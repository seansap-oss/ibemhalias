import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import { LmsAdminMockNav } from "@/components/mock-test/lms-admin-nav";
import "@/styles/mock-test-lms.css";

import LmsTestBuilder from "@/components/mock-test/lms-test-builder";
import "@/styles/mock-test-smart-import.css";
export default async function Page({params}:{params:Promise<{testId:string}>}){const {testId}=await params;return <LmsMockTheme><LmsAdminMockNav/><LmsTestBuilder testId={testId}/></LmsMockTheme>}
