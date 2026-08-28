import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import { LmsAdminMockNav } from "@/components/mock-test/lms-admin-nav";
import "@/styles/mock-test-lms.css";

import LmsAdminReports from "@/components/mock-test/lms-admin-reports";
export default function Page(){return <LmsMockTheme><LmsAdminMockNav/><LmsAdminReports/></LmsMockTheme>}
