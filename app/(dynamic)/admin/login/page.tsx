import { Suspense } from "react";
import AdminLoginClient from "./admin-login-client";

export default function AdminLoginPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading admin login...</div>}><AdminLoginClient /></Suspense>;
}
