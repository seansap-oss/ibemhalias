import {redirect} from "next/navigation";
import {hasOwnerSession} from "@/lib/super-admin";
import {OwnerFees} from "@/components/admin/owner-fees";
export default async function Page(){if(!(await hasOwnerSession()))redirect("/owner/login");return <OwnerFees/>}
