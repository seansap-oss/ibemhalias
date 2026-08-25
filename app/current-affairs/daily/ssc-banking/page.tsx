import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CategoryCard } from "@/components/portal/page-components";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A3 · SSC BANKING" title="SSC BANKING">
      <div className="grid gap-4 md:grid-cols-3">
        <CategoryCard href="/current-affairs/daily/ssc-banking/daily-ca" title="Daily CA" />
        <CategoryCard href="/current-affairs/daily/ssc-banking/daily-general-studies" title="Daily General Studies" />
        <CategoryCard href="/current-affairs/daily/ssc-banking/others" title="Others" />
      </div>
    </PortalPageShell>
  );
}
