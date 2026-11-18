import Link from "next/link";
import { redirect } from "next/navigation";
import { DirectorDashboard } from "@/components/admin/director-dashboard";
import { hasOwnerSession } from "@/lib/super-admin";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await hasOwnerSession())) redirect("/owner/login");
  return <>
    <nav className="border-b bg-white px-6 py-4">
      <Link href="/owner/dashboard" className="font-bold text-[#202b70]">← Super Admin dashboard</Link>
    </nav>
    <DirectorDashboard scope="owner" />
  </>;
}
