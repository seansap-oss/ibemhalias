import {redirect} from "next/navigation";
import {canViewDirector} from "@/lib/director-access";
import {DirectorDashboard} from "@/components/admin/director-dashboard";
export const dynamic="force-dynamic";
export default async function Page(){if(!(await canViewDirector()))redirect("/staff/login");return <DirectorDashboard/>}
