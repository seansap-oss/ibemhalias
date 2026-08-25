import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CategoryCard } from "@/components/portal/page-components";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A4" title="Civil Service">
      <div className="grid gap-4 sm:grid-cols-3">
        <CategoryCard href="/current-affairs/monthly/civil-service/august" title="August" />
        <CategoryCard href="/current-affairs/monthly/civil-service/sept" title="Sept" />
        <CategoryCard href="/current-affairs/monthly/civil-service/oct" title="Oct" />
      </div>
    </PortalPageShell>
  );
}
