import { redirect } from "next/navigation";
import { hasOwnerSession } from "@/lib/super-admin";
import { OwnerDashboard } from "@/components/admin/owner-dashboard";
export const dynamic = "force-dynamic";
export default async function Page() { if (!(await hasOwnerSession())) redirect("/owner/login"); return <OwnerDashboard />; }
