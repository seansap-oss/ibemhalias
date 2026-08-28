import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import { LmsAdminMockNav } from "@/components/mock-test/lms-admin-nav";
import "@/styles/mock-test-lms.css";

import LmsAdminTests from "@/components/mock-test/lms-admin-tests";
export default function Page(){return <LmsMockTheme><LmsAdminMockNav/><LmsAdminTests/></LmsMockTheme>}
