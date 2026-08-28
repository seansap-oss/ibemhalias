import { LmsMockTheme } from "@/components/mock-test/lms-mock-theme";
import { LmsAdminMockNav } from "@/components/mock-test/lms-admin-nav";
import "@/styles/mock-test-lms.css";

import LmsQuestionBank from "@/components/mock-test/lms-question-bank";
export default function Page(){return <LmsMockTheme><LmsAdminMockNav/><LmsQuestionBank/></LmsMockTheme>}
