import * as React from "react";
import { StudentPortal } from "@/components/student/student-portal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-bold text-slate-500">
          Loading Ibemhal IAS Student Portal…
        </div>
      }
    >
      <StudentPortal />
    </React.Suspense>
  );
}
