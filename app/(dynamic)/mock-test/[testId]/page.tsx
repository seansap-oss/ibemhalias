import ApprovedTestRunner from "@/components/mock-test/approved-test-runner";
import "@/styles/mock-test-approved.css";
import "@/styles/mock-test-completion.css";
export default async function Page({params}:{params:Promise<{testId:string}>}){const {testId}=await params;return <ApprovedTestRunner testId={testId}/>}
