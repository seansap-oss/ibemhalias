import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import { LmsAdminMockNav } from "@/components/mock-test/lms-admin-nav";
import "@/styles/mock-test-lms.css";

import LmsAdminMockDashboard from "@/components/mock-test/lms-admin-dashboard";
export default function Page(){return <LmsMockTheme><LmsAdminMockNav/><LmsAdminMockDashboard/></LmsMockTheme>}
