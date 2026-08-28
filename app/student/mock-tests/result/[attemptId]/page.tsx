import { redirect } from "next/navigation";
export default async function Page({params}:{params:Promise<{attemptId:string}>}){const {attemptId}=await params;redirect(`/mock-test/result/${attemptId}`)}
