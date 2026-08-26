import { Suspense } from "react";
import AdminLoginClient from "./admin-login-client";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
          Loading admin login...
        </div>
      }
    >
      <AdminLoginClient />
    </Suspense>
  );
}

