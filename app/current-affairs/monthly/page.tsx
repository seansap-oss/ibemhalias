import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CategoryCard } from "@/components/portal/page-components";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A4" title="MONTHLY Current Affairs">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <CategoryCard href="/current-affairs/monthly/civil-service" title="Civil Service" />
        <CategoryCard href="/current-affairs/monthly/ssc-banking" title="SSC BANKING" />
      </div>
    </PortalPageShell>
  );
}
