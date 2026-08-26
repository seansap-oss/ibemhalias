import { LiveAdminLayoutContent } from "@/components/live-class/live-admin-layout-content";
export default function LiveClassesAdminLayout({ children }: { children: React.ReactNode }) {
  return <LiveAdminLayoutContent>{children}</LiveAdminLayoutContent>;
}
