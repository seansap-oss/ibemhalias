import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { ResourceTile } from "@/components/portal/page-components";

export default function SSCBankingResourcesPage() {
  return (
    <PortalPageShell eyebrow="A2 · SSC & BANKING" title="SSC & BANKING">
      <div className="grid gap-4 sm:grid-cols-2">
        <ResourceTile href="/resources/ssc-banking/pyqs" title="PYQs" />
        <ResourceTile href="/resources/ssc-banking/others" title="Others" />
      </div>
    </PortalPageShell>
  );
}
