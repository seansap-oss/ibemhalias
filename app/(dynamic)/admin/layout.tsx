import { PremiumAdminShell } from "@/components/admin/premium-admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PremiumAdminShell>{children}</PremiumAdminShell>;
}
