import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import { LmsAdminMockNav } from "@/components/mock-test/lms-admin-nav";
import "@/styles/mock-test-lms.css";

import LmsTestBuilder from "@/components/mock-test/lms-test-builder";
import "@/styles/mock-test-smart-import.css";
export default function Page(){return <LmsMockTheme><LmsAdminMockNav/><LmsTestBuilder testId="new"/></LmsMockTheme>}
