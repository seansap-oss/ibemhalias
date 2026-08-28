import { redirect } from "next/navigation";
export default async function Page({params}:{params:Promise<{testId:string}>}){const {testId}=await params;redirect(`/mock-test/${testId}`)}
